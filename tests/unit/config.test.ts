import {describe, expect, it} from 'vitest';
import {ConfigurationError, createLoadContext, readRuntimeConfig, runtimeConfigContext} from '../../app/lib/config.server';
import {getPublicShell} from '../../app/lib/public-shell.server';
import {loader as rootLoader} from '../../app/root';

describe('fixture configuration and public loader data', () => {
  it('defaults to credential-free fixture mode with no environment file', () => {
    expect(readRuntimeConfig({})).toEqual({mode: 'fixture'});
    expect(readRuntimeConfig({PROOF_CART_MODE: 'fixture'})).toEqual({mode: 'fixture'});
  });

  it.each(['shopify', 'live', '', 'Fixture', ' fixture ', null, 1, false])('fails closed for unsupported mode %j', (mode) => {
    expect(() => readRuntimeConfig({PROOF_CART_MODE: mode})).toThrow(ConfigurationError);
  });

  it('does not echo a secret-shaped unsupported mode in its error', () => {
    const secret = 'DO_NOT_EXPOSE_MODE_SECRET';
    try {
      readRuntimeConfig({PROOF_CART_MODE: secret});
      expect.fail('Unsupported configuration should throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(String(error)).not.toContain(secret);
    }
  });

  it('places only validated config in context and serializes an explicit public allowlist', () => {
    const secret = 'DO_NOT_EXPOSE_PRIVATE_TOKEN';
    const context = createLoadContext({PROOF_CART_MODE: 'fixture', PRIVATE_STOREFRONT_API_TOKEN: secret});
    expect(context.get(runtimeConfigContext)).toEqual({mode: 'fixture'});
    expect(getPublicShell(context.get(runtimeConfigContext))).toEqual({name: 'Proof Cart', mode: 'fixture', stage: 'foundation'});
    const data = rootLoader({context, request: new Request('http://localhost/'), url: new URL('http://localhost/'), pattern: '/', params: {}});
    expect(Object.keys(data).sort()).toEqual(['mode', 'name', 'stage']);
    expect(JSON.stringify(data)).not.toContain(secret);
    expect(JSON.stringify(data)).not.toContain('PRIVATE_STOREFRONT_API_TOKEN');
  });
});
