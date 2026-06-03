import createApp from "@/index";
import { getEnv } from "@/utils/env";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { runPendingJobs } from "@/jobs/scheduler";

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
