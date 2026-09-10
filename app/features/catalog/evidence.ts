import {z} from 'zod';
import type {CatalogObservation} from './domain';
import {CatalogContextSchema, CatalogObservationSchema, EvidenceIdSchema, MoneySchema, ProductIdSchema, QuantityRuleSchema, SourceSchema, VariantIdSchema} from './schemas';

const SubjectSchema = z.discriminatedUnion('kind', [
  z.strictObject({kind: z.literal('product'), id: ProductIdSchema}).readonly(),
  z.strictObject({kind: z.literal('variant'), id: VariantIdSchema}).readonly(),
]);
const RecordSchema = z.strictObject({
  id: EvidenceIdSchema,
  subject: SubjectSchema,
  fieldPath: z.string().max(160).regex(/^(?:price|availableForSale|currentlyNotInStock|quantityAvailable|quantityRule|specifications\.[A-Za-z0-9][A-Za-z0-9_.:-]*)$/),
  value: z.union([z.string().max(1024), z.boolean(), z.int().min(0).max(2147483647), MoneySchema, QuantityRuleSchema]),
  source: SourceSchema,
  context: CatalogContextSchema,
  fetchedAt: z.int().min(0).max(Number.MAX_SAFE_INTEGER),
}).readonly();
const draftShape = {
  observation: CatalogObservationSchema,
  evidence: z.array(RecordSchema).max(4096).readonly(),
};
const DraftSchema = z.strictObject(draftShape).readonly();
const SnapshotSchema = z.strictObject({...draftShape, fingerprint: z.string().regex(/^[a-f0-9]{64}$/)}).readonly();
export type EvidenceRecord = z.infer<typeof RecordSchema>;
export type CatalogSnapshot = z.infer<typeof SnapshotSchema>;
export type FreshnessPolicy = Readonly<{now: number; maxAgeMs: number}>;
export type EvidenceError = 'invalid_snapshot' | 'invalid_clock' | 'stale_evidence' | 'future_evidence' | 'evidence_mismatch' | 'fingerprint_mismatch';
export type SnapshotResult = {ok: true; value: CatalogSnapshot} | {ok: false; error: EvidenceError};

type Claim = {id: string; subject: {kind: 'product' | 'variant'; id: string}; fieldPath: string; value: unknown};
function claims(observation: CatalogObservation): Claim[] {
  const result: Claim[] = [];
  for (const product of observation.products) {
    for (const specification of product.specifications) {
      if (specification.fact.status === 'known') result.push({id: specification.fact.evidenceId, subject: {kind: 'product', id: product.id}, fieldPath: `specifications.${specification.key}`, value: specification.fact.value});
    }
    for (const variant of product.variants) {
      for (const fieldPath of ['price', 'availableForSale', 'currentlyNotInStock', 'quantityAvailable', 'quantityRule'] as const) {
        const fact = variant[fieldPath];
        if (fact.status === 'known') result.push({id: fact.evidenceId, subject: {kind: 'variant', id: variant.id}, fieldPath, value: fact.value});
      }
    }
  }
  return result;
}

// Called only on bounded, parsed, JSON-compatible values, never provider JSON.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function bindingError(draft: z.infer<typeof DraftSchema>, policy: FreshnessPolicy): EvidenceError | undefined {
  if (!Number.isSafeInteger(policy.now) || policy.now < 0 || !Number.isSafeInteger(policy.maxAgeMs) || policy.maxAgeMs < 0) return 'invalid_clock';
  const observed = draft.observation;
  if (observed.fetchedAt > policy.now) return 'future_evidence';
  if (policy.now - observed.fetchedAt > policy.maxAgeMs) return 'stale_evidence';
  const entries = new Map<string, EvidenceRecord>();
  for (const record of draft.evidence) {
    if (record.fetchedAt > policy.now) return 'future_evidence';
    if (policy.now - record.fetchedAt > policy.maxAgeMs) return 'stale_evidence';
    if (entries.has(record.id) || record.fetchedAt !== observed.fetchedAt || canonical(record.source) !== canonical(observed.source) || canonical(record.context) !== canonical(observed.context)) return 'evidence_mismatch';
    entries.set(record.id, record);
  }
  const expected = claims(observed);
  if (expected.length !== entries.size) return 'evidence_mismatch';
  const used = new Set<string>();
  for (const claim of expected) {
    const record = entries.get(claim.id);
    if (!record || used.has(claim.id) || canonical(record.subject) !== canonical(claim.subject) || record.fieldPath !== claim.fieldPath || canonical(record.value) !== canonical(claim.value)) return 'evidence_mismatch';
    used.add(claim.id);
  }
  return undefined;
}

async function fingerprint(draft: z.infer<typeof DraftSchema>): Promise<string> {
  // Evidence order is not semantic; product and variant order is preserved.
  // The digest excludes its own field, avoiding a self-referential hash.
  const ordered = {...draft, evidence: [...draft.evidence].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)};
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(ordered)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** For trusted adapter observations. A digest proves consistency, not authenticity. */
export async function createEvidenceSnapshot(input: unknown, policy: FreshnessPolicy): Promise<SnapshotResult> {
  try {
    const draft = DraftSchema.safeParse(input);
    if (!draft.success) return {ok: false, error: 'invalid_snapshot'};
    const error = bindingError(draft.data, policy);
    if (error) return {ok: false, error};
    return {ok: true, value: Object.freeze({...draft.data, fingerprint: await fingerprint(draft.data)})};
  } catch {return {ok: false, error: 'invalid_snapshot'};}
}

/** Revalidate restored/cached snapshots without changing retrieval timestamps. */
export async function validateEvidenceSnapshot(input: unknown, policy: FreshnessPolicy): Promise<SnapshotResult> {
  try {
    const snapshot = SnapshotSchema.safeParse(input);
    if (!snapshot.success) return {ok: false, error: 'invalid_snapshot'};
    const {observation, evidence, fingerprint: expected} = snapshot.data;
    const error = bindingError({observation, evidence}, policy);
    if (error) return {ok: false, error};
    if (await fingerprint({observation, evidence}) !== expected) return {ok: false, error: 'fingerprint_mismatch'};
    return {ok: true, value: snapshot.data};
  } catch {return {ok: false, error: 'invalid_snapshot'};}
}
