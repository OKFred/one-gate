import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// 加载 .dev.vars 到 process.env（与 Workers 池共用同一份环境变量文件）
dotenv.config({ path: ".dev.vars" });

export default defineConfig({
  test: {
    name: "node",
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    include: [
      "src/**/*.node.spec.ts",
    ],
  },
});

