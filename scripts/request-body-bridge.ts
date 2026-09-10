import {Buffer} from 'node:buffer';
import {IncomingMessage, type ServerResponse} from 'node:http';

export const BODY_LIMIT_BYTES = 64 * 1024;
export const BODY_TIMEOUT_MS = 5_000;

type Dispatch = (request: IncomingMessage, response: ServerResponse) => void;

/** Local Vite/Oxygen adaptation only; production actions need their own limits. */
export function createRequestBodyBridge(dispatch: Dispatch) {
  const replayed = new WeakSet<IncomingMessage>();
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    if (replayed.has(request)) {next(); return;}
    const lengthHeader = request.headers['content-length'];
    const chunked = request.headers['transfer-encoding'] !== undefined;
    const declared = lengthHeader === undefined ? 0 : Number(lengthHeader);
    const hasBody = chunked || declared !== 0;
    // Fetch rejects even a zero-length body on GET/HEAD. Oxygen tests the
    // presence of this header, rather than its numerical value.
    if (!hasBody) {delete request.headers['content-length']; next(); return;}

    response.shouldKeepAlive = false;
    response.setHeader('Connection', 'close');
    let settled = false;
    let size = 0;
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => reject(408), BODY_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timer);
      request.off('data', onData);
      request.off('end', onEnd);
      request.off('aborted', onAborted);
    };
    const reject = (status: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      chunks.length = 0;
      request.pause();
      if (!response.destroyed) {
        response.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'});
        response.end('Request body rejected.', () => request.destroy());
      } else request.destroy();
    };
    function onAborted() {reject(400);}
    function onData(chunk: Buffer) {
      size += chunk.byteLength;
      if (size > BODY_LIMIT_BYTES) {reject(413); return;}
      chunks.push(chunk);
    }
    function onEnd() {
      if (!request.complete || (!chunked && size !== declared)) {reject(400); return;}
      settled = true;
      cleanup();
      const body = Buffer.concat(chunks, size);
      chunks.length = 0;
      // Connect's next() cannot replace an already consumed request. Re-enter
      // the stack with a fresh readable, marked to bypass this first middleware.
      // Node's parser has already decoded chunk framing; preserve the exact bytes.
      const replay = new IncomingMessage(request.socket);
      replay.method = request.method;
      replay.url = request.url;
      replay.httpVersion = request.httpVersion;
      replay.httpVersionMajor = request.httpVersionMajor;
      replay.httpVersionMinor = request.httpVersionMinor;
      replay.headers = {...request.headers, connection: 'close'};
      delete replay.headers['transfer-encoding'];
      delete replay.headers['keep-alive'];
      delete replay.headers.trailer;
      if (size > 0) replay.headers['content-length'] = String(size);
      else delete replay.headers['content-length'];
      replay.rawHeaders = Object.entries(replay.headers).flatMap(([key, value]) =>
        value === undefined ? [] : (Array.isArray(value) ? value : [value]).flatMap(item => [key, item]));
      replay.complete = true;
      replay.push(body);
      replay.push(null);
      replayed.add(replay);
      const closeReplay = () => replay.destroy();
      response.once('close', closeReplay);
      replay.once('close', () => response.off('close', closeReplay));
      dispatch(replay, response);
    }
    // Keep a harmless listener until close: aborted uploads can emit error after
    // aborted. Neither provider messages nor request contents reach logs/errors.
    const onError = () => reject(400);
    request.on('error', onError);
    request.once('close', () => request.off('error', onError));
    if (request.method === 'GET' || request.method === 'HEAD') {reject(400); return;}
    if (!Number.isSafeInteger(declared) || declared < 0 || (chunked && lengthHeader !== undefined)) {reject(400); return;}
    if (declared > BODY_LIMIT_BYTES) {reject(413); return;}
    request.on('aborted', onAborted);
    request.on('data', onData);
    request.once('end', onEnd);
  };
}
