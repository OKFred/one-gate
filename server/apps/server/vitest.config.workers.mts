import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    name: "workers",
    alias: [
      { find: /^@\/(.*)\.js$/, replacement: path.resolve(__dirname, "./src").replace(/\\/g, "/") + "/$1" },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, "./src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/core\/(.*)\.js$/, replacement: path.resolve(__dirname, "../../packages/core/src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/core\/(.*)$/, replacement: path.resolve(__dirname, "../../packages/core/src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/infra\/(.*)\.js$/, replacement: path.resolve(__dirname, "../../packages/infra/src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/infra\/(.*)$/, replacement: path.resolve(__dirname, "../../packages/infra/src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/biz\/(.*)\.js$/, replacement: path.resolve(__dirname, "../../packages/biz/src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/biz\/(.*)$/, replacement: path.resolve(__dirname, "../../packages/biz/src").replace(/\\/g, "/") + "/$1" },
      { find: "pino", replacement: path.resolve(__dirname, "./test/mocks/pino.ts").replace(/\\/g, "/") },
    ],
    include: [
      "src/**/*.spec.ts",
      "src/**/*.workers.spec.ts",
      "../../packages/*/src/**/*.spec.ts",
      "../../packages/*/src/**/*.workers.spec.ts",
      "test/index.spec.ts"
    ],
    setupFiles: ["./test/setup.workers.ts"],
    exclude: [
      "**/*.node.spec.ts",
      "../../packages/*/src/**/*.node.spec.ts"
    ],
  },
  ssr: {
    noExternal: true,
  },
});


