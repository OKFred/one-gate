import createApp from "./index.js";
import { setD1Binding } from "@hodor/core/db/index.js";
import { setKVBinding } from "@hodor/core/middleware/cache/index.js";
import { setEnv } from "@hodor/core/utils/env.js";
import { runPendingJobs } from "@hodor/admin/maintenance/cron/scheduler.js";
import { timeoutExpiredDeviceTasks } from "@hodor/admin/mobile/async-task/facade.js";
import {
  cleanupExpiredDeviceEvents,
  markTimedOutDevicesOffline,
  verifyDeviceReportToken,
} from "@hodor/admin/mobile/device/facade.js";
import {
  cleanupDeviceOpsAudits,
  expireDeviceOpsSessions,
} from "@hodor/admin/mobile/device-ops/facade.js";
export { MobileOpsSession } from "./mobile-ops-session.js";

let app: ReturnType<typeof createApp> | null = null;

/** Handle the dedicated device-operations WebSocket upgrade route. */
async function handleMobileOpsUpgrade(
  request: Request,
  env: Env
): Promise<Response | null> {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket")
    return null;
  const url = new URL(request.url);
  const matched =
    /^\/api\/v1\/admin\/mobile\/device-ops\/ws\/(ops_[A-Za-z0-9_-]{8,96})$/.exec(
      url.pathname
    );
  if (!matched) return null;
  const sessionId = matched[1];
  const row = await env.DB.prepare(
    `SELECT client_id AS clientId, active_client_id AS activeClientId, expires_at_utc AS expiresAtUtc
     FROM admin_mobile_device_ops_session WHERE session_id = ?`
  )
    .bind(sessionId)
    .first<{
      clientId: string;
      activeClientId: string | null;
      expiresAtUtc: number;
    }>();
  if (!row || !row.activeClientId || row.expiresAtUtc <= Date.now()) {
    return new Response("Operations session is unavailable", { status: 410 });
  }

  const headers = new Headers(request.headers);
  const authorization = headers.get("authorization") || "";
  const deviceToken = authorization.startsWith("Device ")
    ? authorization.slice("Device ".length)
    : "";
  let role: "device" | "operator";
  if (deviceToken) {
    try {
      await verifyDeviceReportToken(row.clientId, deviceToken);
    } catch {
      return new Response("Invalid device credentials", { status: 401 });
    }
    role = "device";
    headers.set("x-ops-client-id", row.clientId);
  } else {
    const allowedOrigins = (env.MOBILE_OPS_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const origin = headers.get("origin") || "";
    if (!allowedOrigins.includes(origin)) {
      return new Response("Origin is not allowed", { status: 403 });
    }
    const protocols = (headers.get("sec-websocket-protocol") || "")
      .split(",")
      .map((value) => value.trim());
    const ticketProtocol = protocols.find((value) =>
      value.startsWith("ticket.")
    );
    if (!protocols.includes("autojs6-ops-v1") || !ticketProtocol) {
      return new Response("Missing operations ticket", { status: 401 });
    }
    role = "operator";
    headers.set("x-ops-ticket", ticketProtocol.slice("ticket.".length));
  }
  headers.delete("authorization");
  headers.set("x-ops-role", role);
  const stub = env.MOBILE_OPS.getByName(sessionId);
  return stub.fetch(new Request(request, { headers }));
}

export default {
  /**
   * Cloudflare Workers fetch handler.
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // 1. 将绑定注入数据库和缓存层
    if (env.DB) {
      setD1Binding(env.DB);
    }
    if (env.KV) {
      setKVBinding(env.KV);
    }

    // 2. 全局设置环境变量
    setEnv(env);

    const opsResponse = await handleMobileOpsUpgrade(request, env);
    if (opsResponse) return opsResponse;

    // 3. 将应用实例初始化为单例
    if (!app) {
      app = createApp();
    }

    // 4. 通过 Hono 处理请求
    return app.fetch(request, env, ctx);
  },

  /**
   * Cloudflare Workers scheduled event handler.
   */
  async scheduled(
    _event: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) {
    // 1. 将绑定注入数据库和缓存层
    if (env.DB) {
      setD1Binding(env.DB);
    }
    if (env.KV) {
      setKVBinding(env.KV);
    }

    // 2. 全局设置环境变量
    setEnv(env);

    // 3. 执行待处理的定时任务
    ctx.waitUntil(
      Promise.all([
        runPendingJobs(),
        timeoutExpiredDeviceTasks(),
        markTimedOutDevicesOffline(),
        cleanupExpiredDeviceEvents(),
        expireDeviceOpsSessions(),
        cleanupDeviceOpsAudits(),
      ]).then(() => undefined)
    );
  },
};
