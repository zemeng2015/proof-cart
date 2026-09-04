import {createContext, RouterContextProvider} from 'react-router';

export type RuntimeConfig = Readonly<{mode: 'fixture'}>;
export type RuntimeEnvironment = Readonly<Record<string, unknown>>;

export class ConfigurationError extends Error {
  constructor() {
    // Never interpolate the supplied value: it can contain a secret.
    super('This preview supports fixture mode only.');
    this.name = 'ConfigurationError';
  }
}

export function readRuntimeConfig(env: RuntimeEnvironment): RuntimeConfig {
  const mode = env.PROOF_CART_MODE;
  if (mode !== undefined && mode !== 'fixture') throw new ConfigurationError();
  return Object.freeze({mode: 'fixture'});
}

export const runtimeConfigContext = createContext<RuntimeConfig>();

export function createLoadContext(env: RuntimeEnvironment): RouterContextProvider {
  const context = new RouterContextProvider();
  context.set(runtimeConfigContext, readRuntimeConfig(env));
  return context;
}
