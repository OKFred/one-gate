import createApp from "./index.js";
import { getEnv } from "@hodor/core/utils/env.js";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { runPendingJobs } from "@hodor/admin/maintenance/cron/scheduler.js";

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

  // 启动定时任务驱动 (每分钟扫描并执行一次)
  cron.schedule("* * * * *", async () => {
    try {
      await runPendingJobs();
    } catch (err) {
      console.error("[Node Scheduler] 定时任务扫描失败:", err);
    }
  });
}
main();
