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
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, "./src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/core\/(.*)/, replacement: path.resolve(__dirname, "../../packages/core/src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/infra\/(.*)/, replacement: path.resolve(__dirname, "../../packages/infra/src").replace(/\\/g, "/") + "/$1" },
      { find: /^@hodor\/biz\/(.*)/, replacement: path.resolve(__dirname, "../../packages/biz/src").replace(/\\/g, "/") + "/$1" },
      { find: "pino", replacement: path.resolve(__dirname, "./test/mocks/pino.ts").replace(/\\/g, "/") },
    ],
    include: [
      "src/**/*.spec.ts",
      "src/**/*.node.spec.ts",
      "../../packages/*/src/**/*.spec.ts",
      "../../packages/*/src/**/*.node.spec.ts",
    ],
    exclude: [
      "src/**/*.workers.spec.ts",
      "../../packages/*/src/**/*.workers.spec.ts",
    ],
  },
});

