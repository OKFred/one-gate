import { OpenAPIHono } from "@hono/zod-openapi";
import logHandler from "@/middleware/logger";
import errorHandler from "@/middleware/errorHandler";
import docRegister from "@/middleware/doc/docRegister";
import corsHandler from "@/middleware/cors";
import nodeServer from "@/middleware/nodeServer/index";
import routeRegister from "@/api/index";
import serverTiming from "@/middleware/serverTiming";
import serveStaticFiles from "@/middleware/serveStatic";
import type { AppBindings, NodeHonoContext } from "@/types/app";
import initDatabase from "@/db/init";
import { getEnv, setEnv } from "@/utils/env";

async function createApp() {
  const app = new OpenAPIHono<AppBindings>();

  // In Cloudflare Workers, inject the env bindings into our utility
  app.use("*", async (c, next) => {
    setEnv(c.env);
    await next();
  });

  serveStaticFiles(app);
  logHandler(app);
  errorHandler(app);
  corsHandler(app);
  serverTiming(app);
  //   basicAuthHandler(app);
  //   bearerAuthHandler(app);
  //   pathHandler(app);
  docRegister(app);
  const subApp = await routeRegister();
  const baseApiPath = getEnv("BASE_API_PATH");
  !baseApiPath && console.error("❌.MISSING ENV: BASE_API_PATH");
  app.route(baseApiPath || "", subApp);

  // 初始化数据库数据（超级管理员角色和账号）
  // 同时初始化多语言缓存
  setTimeout(async () => {
    await initDatabase();
  }, 0);

  nodeServer(app);
  //   normalRouter(app);
  app.get("/healthCheck", (c: NodeHonoContext) => {
    const { logger } = c.var;
    logger.info("gotcha");
    return c.json({
      ok: true,
      data: new Date().toLocaleString(),
      message: "OK",
    });
  });
  return app;
}
export default createApp;
