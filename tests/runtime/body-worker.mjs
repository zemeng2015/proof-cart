// Test-only entry: never imported by the application or normal Vite config.
let received = 0;
export default {
  async fetch(request) {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return globalThis.Response.json({received});
    }
    const bytes = await request.arrayBuffer();
    received++;
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return globalThis.Response.json({
      received,
      size: bytes.byteLength,
      sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''),
      method: request.method,
    });
  },
};
