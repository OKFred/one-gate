import { OpenAPIHono } from "@hono/zod-openapi";
import logHandler from "@/middleware/logger";
import errorHandler from "@/middleware/errorHandler";
import docRegister from "@/middleware/doc/docRegister";
import corsHandler from "@/middleware/cors";
import routeRegister from "@/api/index";
import serverTiming from "@/middleware/serverTiming";
import serveStaticFiles from "@/middleware/serveStatic";
import type { AppBindings, NodeHonoContext } from "@/types/app";
import { getEnv } from "@/utils/env";

function createApp() {
  const app = new OpenAPIHono<AppBindings>();

  serveStaticFiles(app);
  errorHandler(app);
  corsHandler(app);
  serverTiming(app);
  //   basicAuthHandler(app);
  //   bearerAuthHandler(app);
  //   pathHandler(app);
  logHandler(app);
  getEnv("NODE_ENV") !== "production" && docRegister(app);
  const subApp = routeRegister();
  const baseApiPath = getEnv("BASE_API_PATH");
  !baseApiPath && console.error("❌.MISSING ENV: BASE_API_PATH");
  app.route(baseApiPath || "", subApp);

  //   normalRouter(app);
  app.get("/healthCheck", (c: NodeHonoContext) => {
    return c.json({
      ok: true,
      data: new Date().toLocaleString(),
      message: "I am OK!",
    });
  });
  return app;
}
export default createApp;
