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
      {
        find: /^@hodor\/core\/db\/sql\/(system_|maintenance_|i18n_|mail_|oss_|swarm_|ai_|admin_)(.*)\.sql(\?raw)?$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/core/src/db/sql/admin")
            .replace(/\\/g, "/") + "/$1$2.sql$3",
      },
      {
        find: /^@hodor\/core\/db\/sql\/(enterprise_)(.*)\.sql(\?raw)?$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/core/src/db/sql/enterprise")
            .replace(/\\/g, "/") + "/$1$2.sql$3",
      },
      {
        find: /^@\/(.*)\.js$/,
        replacement:
          path.resolve(__dirname, "./src").replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@\/(.*)$/,
        replacement:
          path.resolve(__dirname, "./src").replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/core\/(.*)\.js$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/core/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/core\/(.*)$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/core/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/admin\/(.*)\.js$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/admin/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/admin\/(.*)$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/admin/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/enterprise\/(.*)\.js$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/enterprise/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/enterprise\/(.*)$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/enterprise/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/personal\/(.*)\.js$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/personal/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/personal\/(.*)$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/personal/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: "pino",
        replacement: path
          .resolve(__dirname, "./test/mocks/pino.ts")
          .replace(/\\/g, "/"),
      },
    ],
    include: [
      "src/**/*.spec.ts",
      "src/**/*.workers.spec.ts",
      "../../packages/*/src/**/*.spec.ts",
      "../../packages/*/src/**/*.workers.spec.ts",
      "test/index.spec.ts",
    ],
    setupFiles: ["./test/setup.workers.ts"],
    exclude: ["**/*.node.spec.ts", "../../packages/*/src/**/*.node.spec.ts"],
  },
  ssr: {
    noExternal: true,
  },
});
