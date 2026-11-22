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
      'no-empty': ['error', { allowEmptyCatch: true }],
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
        {
          selector:
            "LogicalExpression[operator='||'][left.type='CallExpression'][left.callee.name='t'][right.type='Literal']",
          message: 'Do not pass fallback strings to t(); add missing keys to locale files instead.',
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.object.type='NewExpression'][callee.object.callee.name='Date'][callee.property.name=/^toLocale(Date|Time)?String$/]",
          message: 'Use dayjs(...) instead of new Date().toLocaleString() for timestamps.',
        },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['e2e/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
