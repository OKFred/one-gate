import fs from "node:fs";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const anyBaselinePath = path.resolve(
  __dirname,
  "../scripts/any-ratchet-baseline.json"
);
const anyBaseline = JSON.parse(fs.readFileSync(anyBaselinePath, "utf8"));
const legacyAnyFiles = Object.keys(anyBaseline)
  .filter((file) => file.startsWith("server/"))
  .map((file) => file.slice("server/".length));

export default [
  {
    ignores: [
      "**/dist",
      "**/node_modules",
      "**/.wrangler",
      "**/.vitest",
      "**/*.d.ts",
      "**/swagger-ui-bundle.js",
      "**/public",
      "**/*.sh",
      "**/*.md",
    ],
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
    },

    rules: {
      "no-unused-vars": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "always" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
          caughtErrors: "none",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "prettier/prettier": [
        "error",
        {
          endOfLine: "lf",
        },
      ],
    },
  },
  {
    files: legacyAnyFiles,
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: [
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/*.contract-tests.ts",
      "**/__test/**",
      "test/**",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
