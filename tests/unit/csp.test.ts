import {describe, expect, it} from 'vitest';
import {createFixtureCsp} from '../../app/lib/csp.server';

describe('fixture CSP', () => {
  it('permits local assets and only the server nonce for inline scripts', () => {
    const header = createFixtureCsp('syntheticNonce123');
    expect(header).toContain("script-src 'self' 'nonce-syntheticNonce123'");
    expect(header).toContain("connect-src 'self';");
    expect(header).toContain("style-src 'self';");
    expect(header).not.toMatch(/https?:|wss?:|unsafe-inline|shopify|monorail/);
  });

  it('scopes dev websocket allowances to loopback and allows Vite style injection only in dev', () => {
    const header = createFixtureCsp('syntheticNonce123', true);
    expect(header).toContain("connect-src 'self' ws://127.0.0.1:* ws://localhost:*");
    expect(header).toContain("style-src 'self' 'unsafe-inline'");
    expect(header).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it.each(['', "bad'; connect-src *", '\nnonce'])('rejects invalid nonce input', (nonce) => {
    expect(() => createFixtureCsp(nonce)).toThrow('Invalid script nonce.');
  });
});
