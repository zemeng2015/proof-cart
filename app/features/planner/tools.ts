import type {CatalogContext, CatalogSource} from '../catalog/domain';
import {createCatalogPort, ProductInputSchema, SearchInputSchema, VariantsInputSchema, type CatalogError, type CatalogResult, type CommerceCatalogPort} from '../catalog/port';
import {CatalogContextSchema, SourceSchema} from '../catalog/schemas';

export const PLANNER_FRESHNESS_MS = 60_000;
export const PLANNER_DEADLINE_MS = 5_000;
export const PLANNER_TOOL_LIMIT = 3;
export type PlannerDependencies = Readonly<{catalog: CommerceCatalogPort; source: CatalogSource; context: CatalogContext; now: () => number}>;
export type ToolError = CatalogError | 'tool_not_allowed' | 'tool_budget_exceeded' | 'deadline_exceeded' | 'invalid_configuration';
export type ToolResult = CatalogResult | Readonly<{ok: false; error: ToolError}>;
export type ToolTrace = Readonly<{call: number; tool: 'search' | 'getProduct' | 'getVariants' | 'rejected'; outcome: 'ok' | ToolError}>;
const failure = (error: ToolError): ToolResult => Object.freeze({ok: false, error});

/** One registry per run. Calls counts reserved attempt slots, capped at three;
 * denied fourth/later attempts cannot grow its trace or dispatch a provider call.
 * The five-second deadline is shared by all calls, never reset per invocation.
 */
export function createReadOnlyTools(deps: PlannerDependencies) {
  let calls = 0;
  const trace: ToolTrace[] = [];
  const startedWall = performance.now();
  let started = 0;
  let previous = 0;
  let clockInvalid = false;
  function readClock() {
    try {
      const value = deps.now();
      if (clockInvalid || !Number.isSafeInteger(value) || value < previous) throw new Error();
      previous = value;
      return value;
    } catch {clockInvalid = true; throw new Error();}
  }
  let context: CatalogContext | undefined;
  let catalog: CommerceCatalogPort | undefined;
  try {
    started = readClock();
    context = CatalogContextSchema.parse(deps.context);
    catalog = createCatalogPort(deps.catalog, SourceSchema.parse(deps.source), () => ({now: readClock(), maxAgeMs: PLANNER_FRESHNESS_MS}));
  } catch { /* Configuration is never copied into a result. */ }
  async function dispatch(name: unknown, input: unknown): Promise<ToolResult> {
    if (calls >= PLANNER_TOOL_LIMIT) return failure('tool_budget_exceeded');
    const call = ++calls;
    const tool = name === 'search' || name === 'getProduct' || name === 'getVariants' ? name : 'rejected';
    const finish = (result: ToolResult) => {
      trace.push(Object.freeze({call, tool, outcome: result.ok ? 'ok' : result.error}));
      return result;
    };
    if (!catalog || !context) return finish(failure('invalid_configuration'));
    if (tool === 'rejected') return finish(failure('tool_not_allowed'));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const current = readClock();
      const remaining = Math.min(PLANNER_DEADLINE_MS - (current - started), PLANNER_DEADLINE_MS - (performance.now() - startedWall));
      if (remaining <= 0) return finish(failure('deadline_exceeded'));
      const schema = tool === 'search' ? SearchInputSchema : tool === 'getProduct' ? ProductInputSchema : VariantsInputSchema;
      const parsed = schema.safeParse(input);
      if (!parsed.success || parsed.data.context.market !== context.market || parsed.data.context.country !== context.country || parsed.data.context.language !== context.language) return finish(failure('invalid_input'));
      // Dispatch only the parsed copy: rereading raw inputs could observe a
      // different context from an accessor after the trusted-context check.
      const operation = 'query' in parsed.data ? catalog.search(parsed.data) : 'productId' in parsed.data ? catalog.getProduct(parsed.data) : catalog.getVariants(parsed.data);
      const result = await Promise.race([
        operation,
        new Promise<ToolResult>(resolve => {timer = setTimeout(() => resolve(failure('deadline_exceeded')), remaining);}),
      ]);
      const observed = readClock();
      if (observed - started >= PLANNER_DEADLINE_MS || performance.now() - startedWall >= PLANNER_DEADLINE_MS) return finish(failure('deadline_exceeded'));
      return finish(result);
    } catch {return finish(failure(clockInvalid ? 'invalid_configuration' : 'provider_error'));}
    finally {clearTimeout(timer);}
  }
  return Object.freeze({
    dispatch,
    get stats() {return Object.freeze({calls, trace: Object.freeze([...trace].sort((a, b) => a.call - b.call))});},
  });
}
