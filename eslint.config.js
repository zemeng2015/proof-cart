import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {ignores: ['node_modules/**', 'dist/**', '.react-router/**', '.local/**', 'coverage/**', 'playwright-report/**', 'test-results/**', '**/*.generated.d.ts']},
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {languageOptions: {globals: {console: 'readonly', process: 'readonly', URL: 'readonly', fetch: 'readonly', AbortSignal: 'readonly'}}},
  {
    files: ['app/**/*.{ts,tsx}', 'server.ts', 'tests/**/*.{ts,tsx}', '*.config.ts'],
    languageOptions: {
      globals: {window: 'readonly', document: 'readonly', Request: 'readonly', Response: 'readonly', Headers: 'readonly', HTMLScriptElement: 'readonly'},
    },
  },
  {
    files: ['app/**/*.tsx'],
    plugins: {'jsx-a11y': jsxA11y},
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
);
