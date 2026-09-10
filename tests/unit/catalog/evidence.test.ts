// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {createEvidenceSnapshot, validateEvidenceSnapshot} from '../../../app/features/catalog/evidence';

const policy = {now: 1100, maxAgeMs: 100};
function draft() {
  const source = {kind: 'fixture', dataset: 'catalog', version: 'v1'};
  const context = {market: 'retail', country: 'US', language: 'EN'};
  const subject = {kind: 'variant', id: 'fixture:variant:cup-blue'};
  const value = {amount: '19.999', currencyCode: 'USD'};
  return {
    observation: {source, context, fetchedAt: 1000, productsComplete: true, products: [{
      id: 'fixture:product:cup', title: 'Cup', description: '', canonicalUrl: null, specifications: [], variantsComplete: true,
      variants: [{id: subject.id, productId: 'fixture:product:cup', title: 'Blue',
        price: {status: 'known', value, evidenceId: 'price'},
        availableForSale: {status: 'known', value: true, evidenceId: 'available'},
        currentlyNotInStock: {status: 'unknown', reason: 'not_requested'},
        quantityAvailable: {status: 'unknown', reason: 'restricted'},
        quantityRule: {status: 'unknown', reason: 'not_requested'},
      }],
    }]},
    evidence: [
      {id: 'price', subject, fieldPath: 'price', value, source, context, fetchedAt: 1000},
      {id: 'available', subject, fieldPath: 'availableForSale', value: true, source, context, fetchedAt: 1000},
    ],
  };
}

describe('evidence binding and freshness', () => {
  it('rejects two known claims reusing an ID even with matching ledger cardinality', async () => {
    const input = draft();
    input.observation.products[0]!.variants[0]!.availableForSale.evidenceId = 'price';
    expect(await createEvidenceSnapshot(input, policy)).toEqual({ok: false, error: 'evidence_mismatch'});
  });
  it('binds structured specifications, zero inventory, backorders, and quantity rules without inference', async () => {
    const input = draft();
    const product = input.observation.products[0]!;
    const variant = product.variants[0]!;
    const record = input.evidence[0]!;
    const rule = {minimum: 2, maximum: 8, increment: 2};
    const known = <T,>(value: T, evidenceId: string) => ({status: 'known', value, evidenceId});
    const enriched = {
      observation: {...input.observation, products: [{...product,
        specifications: [{key: 'material', label: 'Material', fact: known('Ceramic', 'material')}],
        variants: [{...variant, currentlyNotInStock: known(true, 'backorder'), quantityAvailable: known(0, 'inventory'), quantityRule: known(rule, 'rule')}],
      }]},
      evidence: [...input.evidence,
        {...record, id: 'material', subject: {kind: 'product', id: product.id}, fieldPath: 'specifications.material', value: 'Ceramic'},
        {...record, id: 'backorder', fieldPath: 'currentlyNotInStock', value: true},
        {...record, id: 'inventory', fieldPath: 'quantityAvailable', value: 0},
        {...record, id: 'rule', fieldPath: 'quantityRule', value: rule},
      ],
    };
    const snapshot = await createEvidenceSnapshot(enriched, policy);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) throw new Error('Invalid fixture');
    expect(snapshot.value.evidence).toHaveLength(6);
    expect(Object.isFrozen(snapshot.value.observation.products[0]!.specifications[0]!.fact)).toBe(true);
    const substituted = {...enriched, evidence: enriched.evidence.map(item => item.id === 'material' ? {...item, subject: record.subject} : item)};
    expect(await createEvidenceSnapshot(substituted, policy)).toEqual({ok: false, error: 'evidence_mismatch'});
    const changedRule = {...enriched, evidence: enriched.evidence.map(item => item.id === 'rule' ? {...item, value: {...rule, maximum: 10}} : item)};
    expect(await createEvidenceSnapshot(changedRule, policy)).toEqual({ok: false, error: 'evidence_mismatch'});
  });

  it('rejects a stale or future ledger record even when its observation is fresh', async () => {
    for (const [fetchedAt, error] of [[999, 'stale_evidence'], [1101, 'future_evidence']] as const) {
      const input = draft();
      input.evidence[0]!.fetchedAt = fetchedAt;
      expect(await createEvidenceSnapshot(input, policy)).toEqual({ok: false, error});
    }
  });

  it('creates a deterministic immutable snapshot and validates it after JSON restoration', async () => {
    const input = draft();
    const a = await createEvidenceSnapshot(input, policy);
    const b = await createEvidenceSnapshot({...input, evidence: [...input.evidence].reverse()}, policy);
    if (!a.ok || !b.ok) throw new Error('Invalid fixture');
    expect(a.value.fingerprint).toBe(b.value.fingerprint);
    expect(a.value.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(a.value.evidence[0]!.subject)).toBe(true);
    expect(Object.isFrozen(a.value)).toBe(true);
    input.observation.products[0]!.title = 'Changed';
    expect(a.value.observation.products[0]!.title).toBe('Cup');
    expect(await validateEvidenceSnapshot(JSON.parse(JSON.stringify(a.value)), policy)).toEqual(a);
  });

  it.each(['subject', 'field', 'value', 'currency', 'source', 'context', 'time', 'missing', 'duplicate', 'unused'])('rejects %s evidence substitution', async kind => {
    const input = draft();
    const record = input.evidence[0]!;
    if (kind === 'subject') record.subject = {...record.subject, id: 'fixture:variant:other'};
    if (kind === 'field') record.fieldPath = 'quantityAvailable';
    if (kind === 'value') record.value = {amount: '1', currencyCode: 'USD'};
    if (kind === 'currency') record.value = {amount: '19.999', currencyCode: 'CAD'};
    if (kind === 'source') record.source = {...record.source, version: 'v2'};
    if (kind === 'context') record.context = {...record.context, country: 'CA'};
    if (kind === 'time') record.fetchedAt = 1001;
    if (kind === 'missing') input.evidence.pop();
    if (kind === 'duplicate') input.evidence.push(record);
    if (kind === 'unused') input.evidence.push({...record, id: 'unused'});
    expect(await createEvidenceSnapshot(input, policy)).toEqual({ok: false, error: 'evidence_mismatch'});
  });

  it('uses injected time, rejects future/stale data, and never restamps cached observations', async () => {
    expect(await createEvidenceSnapshot(draft(), {now: 999, maxAgeMs: 100})).toEqual({ok: false, error: 'future_evidence'});
    expect(await createEvidenceSnapshot(draft(), {now: 1101, maxAgeMs: 100})).toEqual({ok: false, error: 'stale_evidence'});
    expect(await createEvidenceSnapshot(draft(), {now: NaN, maxAgeMs: 100})).toEqual({ok: false, error: 'invalid_clock'});
    const snapshot = await createEvidenceSnapshot(draft(), policy);
    if (!snapshot.ok) throw new Error('Invalid fixture');
    expect(await validateEvidenceSnapshot(snapshot.value, {now: 1101, maxAgeMs: 100})).toEqual({ok: false, error: 'stale_evidence'});
    expect(snapshot.value.observation.fetchedAt).toBe(1000);
  });

  it('detects edited snapshot data even when all claim-to-record bindings still match', async () => {
    const snapshot = await createEvidenceSnapshot(draft(), policy);
    if (!snapshot.ok) throw new Error('Invalid fixture');
    const edited = structuredClone(snapshot.value);
    const input = {...edited, observation: {...edited.observation, productsComplete: false}};
    expect(await validateEvidenceSnapshot(input, policy)).toEqual({ok: false, error: 'fingerprint_mismatch'});
  });

  it('returns opaque errors for forbidden fields and malformed input', async () => {
    expect(await createEvidenceSnapshot({...draft(), accessToken: 'SYNTHETIC_SECRET'}, policy)).toEqual({ok: false, error: 'invalid_snapshot'});
    expect(await validateEvidenceSnapshot(null, policy)).toEqual({ok: false, error: 'invalid_snapshot'});
  });
});
