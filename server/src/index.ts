import { OpenAPIHono } from "@hono/zod-openapi";
import logHandler from "@/middleware/logger";
import errorHandler from "@/middleware/errorHandler";
import docRegister from "@/middleware/doc/docRegister";
import corsHandler from "@/middleware/cors";
import routeRegister from "@/api/index";
import serverTiming from "@/middleware/serverTiming";
import serveStaticFiles from "@/middleware/serveStatic";
import { storageMiddleware } from "@/utils/storage";
import type { AppBindings, Context, ResJson } from "@/types/app";
import { getEnv } from "@/utils/env";

function createApp() {
  const app = new OpenAPIHono<AppBindings>();

  serveStaticFiles(app);
  storageMiddleware(app);
  errorHandler(app);
  corsHandler(app);
  serverTiming(app);
  logHandler(app);
  getEnv("NODE_ENV") !== "production" && docRegister(app);
  const subApp = routeRegister();
  const baseApiPath = getEnv("BASE_API_PATH");
  !baseApiPath && console.error("❌.MISSING ENV: BASE_API_PATH");
  app.route(baseApiPath || "", subApp);
  app.get("/healthCheck", (c: Context) => {
    return c.json<ResJson<string>>({
      ok: true,
      data: new Date().toLocaleString(),
      message: "I am OK!",
    });
  });
  app.get("/version.json", (c: Context) => {
    return c.json<ResJson<string>>({
      ok: true,
      data: getEnv("VERSION") || "unknown",
      message: "Version OK!",
    });
  });
  return app;
}
export default createApp;
