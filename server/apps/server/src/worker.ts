import createApp from "./index.js";
import { setD1Binding } from "@hodor/core/db/index.js";
import { setKVBinding } from "@hodor/core/middleware/cache/index.js";
import { setEnv } from "@hodor/core/utils/env.js";
import { runPendingJobs } from "@hodor/admin/maintenance/cron/scheduler.js";
import { timeoutExpiredDeviceTasks } from "@hodor/admin/mobile/async-task/service.js";

let app: ReturnType<typeof createApp> | null = null;

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
      Promise.all([runPendingJobs(), timeoutExpiredDeviceTasks()]).then(
        () => undefined
      )
    );
  },
};
