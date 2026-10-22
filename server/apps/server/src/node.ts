import createApp from "./index.js";
import { readFileSync } from "node:fs";
import { getEnv } from "@hodor/core/utils/env.js";
import { serve } from "@hono/node-server";
import cron from "node-cron";
import { runPendingJobs } from "@hodor/admin/maintenance/cron/scheduler.js";
import {
  runRetentionMaintenance,
  runScheduledMaintenance,
} from "./soft-delete-cleanup.js";
import { startMqttEventListener } from "@hodor/admin/mqtt/listener.js";
import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime.js";
import { createNodePostgresRuntime } from "@hodor/core/db/postgresql/drivers.js";
import {
  InMemoryTotpAttemptCoordinator,
  createTotpGateCenter,
} from "@hodor/admin/system/auth/totp-gate/index.js";

const totpCoordinator = new InMemoryTotpAttemptCoordinator();

/** 启动 Node HTTP、定时任务与 AutoJS6 MQTT 监听服务。 */
function main() {
  const postgresql = isPostgresBackend();
  const connectionString = getEnv("DATABASE_URL");
  const caFile = getEnv("PG_SSL_CA_FILE");
  if (postgresql && !connectionString)
    throw new Error("DATABASE_URL is required for PostgreSQL");
  const database =
    postgresql && connectionString
      ? createNodePostgresRuntime({
          connectionString,
          schema: getEnv("PG_SCHEMA") || "one_gate",
          ca: caFile ? readFileSync(caFile, "utf8") : undefined,
        })
      : undefined;
  const app = createApp({
    resolveTotpGateCenter: () => createTotpGateCenter(totpCoordinator),
  });
  // 启动服务器
  const PORT = Number(getEnv("PORT"));
  if (!PORT) throw new Error("Env:PORT is missing");
  const server = serve({
    port: PORT,
    hostname: getEnv("HOST") || "0.0.0.0",
    fetch: database
      ? (request, env) => database.run(async () => app.fetch(request, env))
      : app.fetch,
  });
  server.on("close", () => {
    void database?.close();
  });
  console.log(`🚀 Server started: http://localhost:${PORT}`);
  if (!postgresql) void startMqttEventListener();

  // 启动定时任务驱动 (每分钟扫描并执行一次)
  cron.schedule("* * * * *", async () => {
    try {
      if (database)
        await database.run(() =>
          runScheduledMaintenance([
            { name: "retention", run: runRetentionMaintenance },
          ])
        );
      else
        await runScheduledMaintenance([
          { name: "cron_jobs", run: runPendingJobs },
          { name: "retention", run: runRetentionMaintenance },
        ]);
    } catch (err) {
      console.error("[Node Scheduler] 定时任务扫描失败:", err);
    }
  });
}
main();
