import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  resolve: {alias: {'~': fileURLToPath(new URL('./app', import.meta.url))}},
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['app/features/catalog/**/*.ts', 'app/features/cart/**/*.ts'],
      exclude: ['app/features/catalog/domain.ts', '**/*.generated.d.ts'],
      reporter: ['text', 'json', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      thresholds: {perFile: true, branches: 85},
    },
  },
});
