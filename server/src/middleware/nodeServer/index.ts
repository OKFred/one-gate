import type { App } from "@/types/app.ts";
import { getEnv } from "@/utils/env";
import { serve } from "@hono/node-server";
import initDatabase from "@/db/init";

export default function nodeServer(app: App) {
  // 初始化数据库数据（超级管理员角色和账号）
  // 同时初始化多语言缓存
  initDatabase();
  // 启动服务器
  const PORT = Number(getEnv("PORT")) || 3000;
  serve({
    port: PORT,
    fetch: app.fetch,
  });
  console.log(`🚀 服务器已启动： http://localhost:${PORT}`);
}
