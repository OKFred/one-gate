import createApp from "./index.js";
import { getEnv } from "@hodor/core/utils/env.js";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { runPendingJobs } from "@hodor/admin/maintenance/cron/scheduler.js";
import {
  runRetentionMaintenance,
  runScheduledMaintenance,
} from "./soft-delete-cleanup.js";
import { startMqttEventListener } from "@hodor/admin/mqtt/listener.js";
import {
  InMemoryTotpAttemptCoordinator,
  createTotpGateCenter,
} from "@hodor/admin/system/auth/totp-gate/index.js";

const totpCoordinator = new InMemoryTotpAttemptCoordinator();

/** 启动 Node HTTP、定时任务与 AutoJS6 MQTT 监听服务。 */
function main() {
  const app = createApp({
    resolveTotpGateCenter: () => createTotpGateCenter(totpCoordinator),
  });
  // 启动服务器
  const PORT = Number(getEnv("PORT"));
  if (!PORT) throw new Error("Env:PORT is missing");
  serve({
    port: PORT,
    fetch: app.fetch,
  });
  console.log(`🚀 Server started: http://localhost:${PORT}`);
  void startMqttEventListener();

  // 启动定时任务驱动 (每分钟扫描并执行一次)
  cron.schedule("* * * * *", async () => {
    try {
      await runScheduledMaintenance([runPendingJobs, runRetentionMaintenance]);
    } catch (err) {
      console.error("[Node Scheduler] 定时任务扫描失败:", err);
    }
  });
}
main();
