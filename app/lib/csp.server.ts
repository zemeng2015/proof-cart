export function createFixtureCsp(nonce: string, development = false): string {
  // Hydrogen supplies a cryptographically random nonce and its React provider.
  // Its default header merges Shopify hosts, so construct our fixture policy.
  if (!/^[A-Za-z0-9+/_=-]+$/.test(nonce)) throw new Error('Invalid script nonce.');
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self'${development ? " 'unsafe-inline'" : ''}`,
    `connect-src 'self'${development ? ' ws://127.0.0.1:* ws://localhost:*' : ''}`,
    "img-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
