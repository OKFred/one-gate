import createApp from "@/index";
import { getEnv } from "@/utils/env";
import { serve } from "@hono/node-server";

function main() {
  const app = createApp();
  // 启动服务器
  const PORT = Number(getEnv("PORT"));
  if (!PORT) throw new Error("Env:PORT is missing");
  serve({
    port: PORT,
    fetch: app.fetch,
  });
  console.log(`🚀 Server started: http://localhost:${PORT}`);
}
main();
