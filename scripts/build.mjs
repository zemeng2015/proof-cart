import {build} from 'vite';

process.env.NODE_ENV = 'production';

// Follow Hydrogen's official two-phase Vite build: client first, then the
// Oxygen worker entry. A bare React Router build emits a router module instead
// of this application's fetch handler.
await build({
  mode: 'production',
  build: {emptyOutDir: true, copyPublicDir: true, sourcemap: false},
});
await build({
  mode: 'production',
  build: {ssr: true, emptyOutDir: false, copyPublicDir: false, sourcemap: false, minify: true},
});
