import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { globalIgnores, defineConfig } from 'eslint/config';
import reactCompiler from 'eslint-plugin-react-compiler';

export default defineConfig([
  globalIgnores(['dist', '**/*.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    plugins: {
      'react-compiler': reactCompiler,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'alert', message: 'Use the shared Notification components instead.' },
        { name: 'confirm', message: 'Use showConfirm instead.' },
        { name: 'prompt', message: 'Use a controlled MUI dialog instead.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='window'][callee.property.name='alert']",
          message: 'Use the shared Notification components instead of window.alert.',
        },
        {
          selector: "CallExpression[callee.object.name='window'][callee.property.name='confirm']",
          message: 'Use showConfirm instead of window.confirm.',
        },
        {
          selector: "CallExpression[callee.object.name='window'][callee.property.name='prompt']",
          message: 'Use a controlled MUI dialog instead of window.prompt.',
        },
        {
          selector:
            "CallExpression[callee.object.name='globalThis'][callee.property.name=/^(alert|confirm|prompt)$/]",
          message: 'Native browser dialogs are prohibited.',
        },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
