import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// 加载 .dev.vars 到 process.env（与 Workers 池共用同一份环境变量文件）
dotenv.config({ path: ".dev.vars" });
// 强制将 DB_FILE_NAME 置空，从而在 Node.js 测试中使用独立的 :memory: 内存数据库，避免并发锁表
process.env.DB_FILE_NAME = "";

export default defineConfig({
  test: {
    name: "node",
    alias: [
      {
        find: /^@hodor\/core\/db\/sql\/maintenance_audit_login\.sql(\?raw)?$/,
        replacement:
          path.resolve(__dirname, "../../packages/core/src/db/sql/admin/base_sys_log.sql").replace(/\\/g, "/") + "$1",
      },
      {
        find: /^@hodor\/core\/db\/sql\/maintenance_compliance\.sql(\?raw)?$/,
        replacement:
          path.resolve(__dirname, "../../packages/core/src/db/sql/admin/compliance_archives.sql").replace(/\\/g, "/") + "$1",
      },
      {
        find: /^@hodor\/core\/db\/sql\/(oss_config|swarm_docker_config|rpa_config)\.sql(\?raw)?$/,
        replacement:
          path.resolve(__dirname, "../../packages/core/src/db/sql/admin/base_sys_config.sql").replace(/\\/g, "/") + "$1",
      },
      {
        find: /^@hodor\/core\/db\/sql\/base_user_config\.sql(\?raw)?$/,
        replacement:
          path.resolve(__dirname, "../../packages/core/src/db/sql/personal/base_user_config.sql").replace(/\\/g, "/") + "$1",
      },
      {
        find: /^@hodor\/core\/db\/sql\/base_(sys_|biz_|audit_)(.*)\.sql(\?raw)?$/,
        replacement:
          path.resolve(__dirname, "../../packages/core/src/db/sql/admin/base_$1$2.sql").replace(/\\/g, "/") + "$3",
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
        find: /^@hodor\/core\/db\/sql\/(personal_)(.*)\.sql(\?raw)?$/,
        replacement:
          path
            .resolve(__dirname, "../../packages/core/src/db/sql/personal")
            .replace(/\\/g, "/") + "/$1$2.sql$3",
      },
      {
        find: /^@\/(.*)/,
        replacement:
          path.resolve(__dirname, "./src").replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/core\/(.*)/,
        replacement:
          path
            .resolve(__dirname, "../../packages/core/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/admin\/(.*)/,
        replacement:
          path
            .resolve(__dirname, "../../packages/admin/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/enterprise\/(.*)/,
        replacement:
          path
            .resolve(__dirname, "../../packages/enterprise/src")
            .replace(/\\/g, "/") + "/$1",
      },
      {
        find: /^@hodor\/personal\/(.*)/,
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
      "src/**/*.node.spec.ts",
      "../../packages/**/src/**/*.spec.ts",
      "../../packages/**/src/**/*.node.spec.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "../../packages/**/node_modules/**",
      "**/*.workers.spec.ts",
      "../../packages/**/src/**/*.workers.spec.ts",
    ],
  },
});
