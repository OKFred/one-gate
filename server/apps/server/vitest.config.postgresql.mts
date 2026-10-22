import { defineConfig } from "vitest/config";
import node from "./vitest.config.node.mjs";

if (!process.env.ONE_GATE_TEST_POSTGRES_URL)
  throw new Error(
    "ONE_GATE_TEST_POSTGRES_URL is required for PostgreSQL integration tests"
  );

export default defineConfig({
  ...node,
  test: {
    ...node.test,
    name: "postgresql",
    include: [
      "src/**/*postgresql*.node.spec.ts",
      "../../packages/**/src/**/*postgresql*.node.spec.ts",
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    maxWorkers: 1,
  },
});
