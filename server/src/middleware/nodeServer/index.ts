import type { App } from "@/types/app.ts";
import { getEnv } from "@/utils/env";
import { serve } from "@hono/node-server";

export default function nodeServer(app: App) {
  // 启动服务器
  const PORT = Number(getEnv("PORT"));
  if (!PORT) throw new Error("Env:PORT is missing");
  serve({
    port: PORT,
    fetch: app.fetch,
  });
  console.log(`🚀 服务器已启动： http://localhost:${PORT}`);
}
