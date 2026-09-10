// @vitest-environment node
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createFixtureCatalog} from '../../app/features/catalog/fixture-adapter';
import {FIXTURE_CONTEXT, FIXTURE_SOURCE} from '../../app/features/catalog/fixture-data';
import {createReadOnlyTools, type PlannerDependencies} from '../../app/features/planner/tools';

const NOW = 100_000;
const search = {query: 'cup', limit: 20, context: FIXTURE_CONTEXT};
const deps = (): PlannerDependencies => ({catalog: createFixtureCatalog({now: () => NOW}), source: FIXTURE_SOURCE, context: FIXTURE_CONTEXT, now: () => NOW});
afterEach(() => {vi.useRealTimers(); vi.restoreAllMocks();});

describe('bounded read-only tool registry', () => {
  it('exposes exactly the three typed reads and bounds concurrent calls and trace growth', async () => {
    const tools = createReadOnlyTools(deps());
    const results = await Promise.all([
      tools.dispatch('search', search),
      tools.dispatch('getProduct', {productId: 'fixture:product:ceramic-cup', context: FIXTURE_CONTEXT}),
      tools.dispatch('getVariants', {variantIds: ['fixture:variant:cup-blue'], context: FIXTURE_CONTEXT}),
      tools.dispatch('search', search),
    ]);
    expect(results.slice(0, 3).every(result => result.ok)).toBe(true);
    expect(results[3]).toEqual({ok: false, error: 'tool_budget_exceeded'});
    for (let index = 0; index < 20; index++) expect(await tools.dispatch('cartCreate', {})).toEqual(results[3]);
    expect(tools.stats.calls).toBe(3);
    expect(tools.stats.trace.map(entry => entry.call)).toEqual([1, 2, 3]);
    expect(Object.isFrozen(tools.stats.trace)).toBe(true);
    expect(Object.isFrozen(tools.stats.trace[0])).toBe(true);
  });
  it('charges invalid and forbidden attempts without exposing raw names or calling the catalog', async () => {
    const configuration = deps();
    const provider = vi.fn(configuration.catalog.search);
    const tools = createReadOnlyTools({...configuration, catalog: {...configuration.catalog, search: provider}});
    expect(await tools.dispatch('SECRET_MUTATION', {})).toEqual({ok: false, error: 'tool_not_allowed'});
    expect(await tools.dispatch('search', {...search, mutate: true})).toEqual({ok: false, error: 'invalid_input'});
    expect(await tools.dispatch('search', {...search, context: {...FIXTURE_CONTEXT, country: 'CA'}})).toEqual({ok: false, error: 'invalid_input'});
    expect(provider).not.toHaveBeenCalled();
    expect(tools.stats.calls).toBe(3);
    expect(JSON.stringify(tools.stats)).not.toContain('SECRET');
  });
  it.each(['market', 'country', 'language'])('rejects a caller-supplied %s different from trusted context', async field => {
    const result = await createReadOnlyTools(deps()).dispatch('search', {...search, context: {...FIXTURE_CONTEXT, [field]: 'ZZ'}});
    expect(result).toEqual({ok: false, error: 'invalid_input'});
  });
  it('rejects malformed trusted source/context and non-finite clocks without throwing', async () => {
    for (const configuration of [{...deps(), source: {...FIXTURE_SOURCE, version: ''}}, {...deps(), context: {...FIXTURE_CONTEXT, country: ''}}, {...deps(), now: () => Infinity}, {...deps(), now: () => {throw new Error('SECRET');}}]) {
      expect(await createReadOnlyTools(configuration).dispatch('search', search)).toEqual({ok: false, error: 'invalid_configuration'});
    }
  });
  it('shares one deadline across calls and rejects backwards clocks', async () => {
    let time = NOW;
    const tools = createReadOnlyTools({...deps(), now: () => time});
    expect((await tools.dispatch('search', search)).ok).toBe(true);
    time += 5_000;
    expect(await tools.dispatch('search', search)).toEqual({ok: false, error: 'deadline_exceeded'});
    time = NOW - 1;
    expect(await tools.dispatch('search', search)).toEqual({ok: false, error: 'invalid_configuration'});
  });
  it('contains exceptions from tool inputs and clocks during dispatch', async () => {
    const tools = createReadOnlyTools(deps());
    expect(await tools.dispatch('search', {get query() {throw new Error('SECRET');}})).toEqual({ok: false, error: 'provider_error'});
    let broken = false;
    const clockTools = createReadOnlyTools({...deps(), now: () => {if (broken) throw new Error('SECRET'); return NOW;}});
    broken = true;
    expect(await clockTools.dispatch('search', search)).toEqual({ok: false, error: 'invalid_configuration'});
  });
  it('rejects clock reversal that remains later than the run start', async () => {
    let time = NOW;
    const tools = createReadOnlyTools({...deps(), now: () => time});
    time += 100;
    expect((await tools.dispatch('search', search)).ok).toBe(true);
    time -= 1;
    expect(await tools.dispatch('search', search)).toEqual({ok: false, error: 'invalid_configuration'});
  });
  it('times out unresolved reads, clears timers and ignores late completion in its trace', async () => {
    vi.useFakeTimers();
    const configuration = deps();
    let finish: (() => void) | undefined;
    const tools = createReadOnlyTools({...configuration, catalog: {...configuration.catalog, search: () => new Promise(resolve => {finish = () => resolve({ok: false, error: 'not_found'});})}});
    const pending = tools.dispatch('search', search);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await pending).toEqual({ok: false, error: 'deadline_exceeded'});
    const trace = tools.stats.trace;
    finish!();
    await Promise.resolve();
    expect(tools.stats.trace).toEqual(trace);
    expect(vi.getTimerCount()).toBe(0);
  });
});
