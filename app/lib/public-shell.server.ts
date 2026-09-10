import type {RuntimeConfig} from './config.server';

export type PublicShell = Readonly<{
  name: 'Proof Cart';
  mode: 'fixture';
  stage: 'foundation';
}>;

export function getPublicShell(config: RuntimeConfig): PublicShell {
  // Deliberate field-by-field public allowlist; never serialize env or context.
  return {name: 'Proof Cart', mode: config.mode, stage: 'foundation'};
}
