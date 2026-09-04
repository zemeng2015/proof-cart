import {StrictMode, startTransition} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {HydratedRouter} from 'react-router/dom';
import {NonceProvider} from '@shopify/hydrogen';

startTransition(() => {
  const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
  hydrateRoot(
    document,
    <StrictMode>
      <NonceProvider value={nonce}>
        <HydratedRouter />
      </NonceProvider>
    </StrictMode>,
  );
});
