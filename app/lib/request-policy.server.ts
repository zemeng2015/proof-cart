export function rejectUnsupportedMethod(request: Request): Response | undefined {
  if (request.method === 'GET' || request.method === 'HEAD') return;
  return new Response('This preview is read-only.', {
    status: 405,
    headers: {
      Allow: 'GET, HEAD',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
