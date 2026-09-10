const MAX_FORM_BYTES = 65_536;
const BODY_TIMEOUT_MS = 5_000;

function failure(status: number): Response {
  return new Response('The comparison request could not be accepted.', {
    status,
    headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'},
  });
}

export function isComparisonForm(request: Request): boolean {
  return request.method === 'POST' && ['/compare', '/compare.data'].includes(new URL(request.url).pathname);
}

/** Read-only comparison forms still have an explicit origin, type, and body boundary.
 * This is not buyer approval authority and does not enable any commerce writes.
 */
export async function prepareComparisonForm(request: Request): Promise<Request | Response> {
  const url = new URL(request.url);
  if (!isComparisonForm(request)) return failure(405);
  if (request.headers.get('Origin') !== url.origin) return failure(403);
  if (!/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') ?? '')) return failure(415);
  const declared = request.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_FORM_BYTES)) return failure(413);
  if (!request.body || request.signal.aborted) return failure(400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  const interrupted = new Promise<Response>((resolve) => {
    abort = () => resolve(failure(400));
    request.signal.addEventListener('abort', abort, {once: true});
    timer = setTimeout(() => resolve(failure(408)), BODY_TIMEOUT_MS);
  });
  try {
    for (;;) {
      const item = await Promise.race([reader.read(), interrupted]);
      if (item instanceof Response) return item;
      if (item.done) break;
      size += item.value.byteLength;
      if (size > MAX_FORM_BYTES) return failure(413);
      chunks.push(item.value);
    }
    if (declared !== null && Number(declared) !== size) return failure(400);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
    const headers = new Headers(request.headers);
    headers.delete('Transfer-Encoding');
    headers.set('Content-Length', String(size));
    return new Request(request, {headers, body: bytes});
  } catch {
    return failure(400);
  } finally {
    clearTimeout(timer);
    if (abort) request.signal.removeEventListener('abort', abort);
    // Cancellation is best effort; an uncooperative stream must not hold the response.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
