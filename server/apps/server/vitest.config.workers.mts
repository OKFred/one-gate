import { createRequire } from "node:module";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import path from "path";

function workersCjsRequireInteropPlugin() {
  return {
    name: "workers-cjs-require-interop",
    enforce: "pre" as const,
    resolveId(
      source: string,
      importer: string | undefined,
      options?: { custom?: Record<string, unknown> }
    ): string | null {
      const nodeResolve = options?.custom?.["node-resolve"] as
        { isRequire?: boolean } | undefined;
      if (!nodeResolve?.isRequire || !importer) {
        return null;
      }
      const cleanImporter = importer
        .split("?")[0]
        .replace(/^\/([A-Za-z]:\/)/, "$1");
      if (source === "pg-protocol") {
        return createRequire(cleanImporter)
          .resolve("pg-protocol/dist/index.js")
          .replace(/\\/g, "/");
      }
      if (source === "luxon") {
        return createRequire(cleanImporter)
          .resolve("luxon")
          .replace(/\\/g, "/");
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    workersCjsRequireInteropPlugin(),
    cloudflareTest({
      remoteBindings: false,
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    name: "workers",
    alias: [
      {
        find: /^@hodor\/core\/db\/sql\/(admin\/)?(maintenance_audit_login|mail_log)\.sql(\?raw)?$/,
        replacement:
          path
            .resolve(
              __dirname,
              "../../packages/core/src/db/sql/admin/base_sys_log.sql"
            )
            .replace(/\\/g, "/") + "$3",
      },
      {
        find: /^@hodor\/core\/db\/sql\/(admin\/)?maintenance_compliance\.sql(\?raw)?$/,
        replacement:
          path
            .resolve(
              __dirname,
              "../../packages/core/src/db/sql/admin/compliance_archives.sql"
            )
            .replace(/\\/g, "/") + "$2",
      },
      {
        find: /^@hodor\/core\/db\/sql\/(admin\/)?base_(sys_|biz_|audit_)(.*)\.sql(\?raw)?$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/core/src/db/sql/admin")
            .replace(/\\/g, "/") + "/base_$2$3.sql$4",
      },
      {
        find: /^@hodor\/core\/db\/sql\/(admin\/)?(oss_config|swarm_docker_config|rpa_config)\.sql(\?raw)?$/,
        replacement:
          path
            .resolve(
              __dirname,
              "../../packages/core/src/db/sql/admin/base_sys_config.sql"
            )
            .replace(/\\/g, "/") + "$3",
      },
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
        find: /^@hodor\/core\/db\/sql\/(personal_|base_user_config)(.*)\.sql(\?raw)?$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/core/src/db/sql/personal")
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
      "../../packages/**/src/**/*.spec.ts",
      "../../packages/**/src/**/*.workers.spec.ts",
      "test/index.spec.ts",
    ],
    setupFiles: ["./test/setup.workers.ts"],
    exclude: [
      "**/node_modules/**",
      "../../packages/**/node_modules/**",
      "**/*.node.spec.ts",
      "../../packages/**/src/**/*.node.spec.ts",
    ],
  },
  ssr: {
    noExternal: true,
  },
});
