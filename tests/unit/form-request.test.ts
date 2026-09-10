// @vitest-environment node
import {afterEach, describe, expect, it, vi} from 'vitest';
import {prepareComparisonForm} from '../../app/lib/form-request.server';

function form(body: BodyInit = 'productId=fixture%3Aproduct%3Aceramic-cup', headers: Record<string, string> = {}, signal?: AbortSignal) {
  return new Request('https://proof.example/compare', {
    method: 'POST', body, headers: {Origin: 'https://proof.example', 'Content-Type': 'application/x-www-form-urlencoded', ...headers},
    ...(signal ? {signal} : {}), ...(body instanceof ReadableStream ? {duplex: 'half'} : {}),
  });
}

function responseStatus(result: Request | Response): number { return result instanceof Response ? result.status : 200; }
afterEach(() => vi.useRealTimers());
describe('comparison form transport policy', () => {
  it('preserves exact multi-chunk form bytes for the router', async () => {
    const raw = 'productId=fixture%3Aproduct%3Acup&remove=%E6%9D%AF';
    const bytes = new TextEncoder().encode(raw);
    const result = await prepareComparisonForm(form(new ReadableStream({start(controller) {
      controller.enqueue(bytes.subarray(0, 9)); controller.enqueue(bytes.subarray(9)); controller.close();
    }}), {'Content-Length': String(bytes.length)}));
    expect(result).toBeInstanceOf(Request);
    expect(await result.text()).toBe(raw);
  });
  it('accepts the framework data-action path and UTF-8 charset', async () => {
    const source = form('productId=cup', {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'});
    const result = await prepareComparisonForm(new Request('https://proof.example/compare.data', source));
    expect(result).toBeInstanceOf(Request);
    expect(await result.text()).toBe('productId=cup');
  });
  it.each(['https://other.example', 'null', 'https://proof.example.evil', ''])('rejects untrusted origin %s', async (Origin) => {
    expect(responseStatus(await prepareComparisonForm(form('secret', {Origin})))).toBe(403);
  });
  it.each(['application/json', 'text/plain', 'multipart/form-data', 'application/x-www-form-urlencoded; charset=latin1'])('rejects unsupported type %s', async (type) => {
    const result = await prepareComparisonForm(form('SECRET', {'Content-Type': type}));
    expect(responseStatus(result)).toBe(415); expect(await result.text()).not.toContain('SECRET');
  });
  it('rejects other routes or methods', async () => {
    expect(responseStatus(await prepareComparisonForm(new Request('https://proof.example/compare')))).toBe(405);
    expect(responseStatus(await prepareComparisonForm(new Request('https://proof.example/cart', form())))).toBe(405);
  });
  it.each(['65537', '-1', 'invalid'])('rejects unsafe declared lengths %s', async (length) => {
    expect(responseStatus(await prepareComparisonForm(form('a', {'Content-Length': length})))).toBe(413);
  });
  it('bounds actual bytes, accepts the limit and rejects a truncated body', async () => {
    expect(await prepareComparisonForm(form('a'.repeat(65_536)))).toBeInstanceOf(Request);
    expect(responseStatus(await prepareComparisonForm(form('a'.repeat(65_537))))).toBe(413);
    expect(responseStatus(await prepareComparisonForm(form('a', {'Content-Length': '2'})))).toBe(400);
  });
  it('rejects an absent body and already aborted request', async () => {
    expect(responseStatus(await prepareComparisonForm(new Request('https://proof.example/compare', {method: 'POST', headers: {Origin: 'https://proof.example', 'Content-Type': 'application/x-www-form-urlencoded'}})))).toBe(400);
    expect(responseStatus(await prepareComparisonForm(form('a', {}, AbortSignal.abort())))).toBe(400);
  });
  it('cancels a stalled body at the deadline', async () => {
    vi.useFakeTimers(); const cancel = vi.fn();
    const pending = prepareComparisonForm(form(new ReadableStream({cancel})));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(responseStatus(await pending)).toBe(408); expect(cancel).toHaveBeenCalledOnce();
  });
  it('cancels on disconnect and converts stream errors to opaque errors', async () => {
    const controller = new AbortController(); const cancel = vi.fn();
    const pending = prepareComparisonForm(form(new ReadableStream({cancel}), {}, controller.signal));
    controller.abort(); expect(responseStatus(await pending)).toBe(400); expect(cancel).toHaveBeenCalledOnce();
    const result = await prepareComparisonForm(form(new ReadableStream({start(stream) {stream.error(new Error('SECRET'));}})));
    expect(responseStatus(result)).toBe(400); expect(await result.text()).not.toContain('SECRET');
  });
});
