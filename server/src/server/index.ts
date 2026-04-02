import { OpenAPIHono } from "@hono/zod-openapi";
import logHandler from "@/middleware/logger";
import errorHandler from "@/middleware/errorHandler";
import docRegister from "@/middleware/doc/docRegister";
import corsHandler from "@/middleware/cors";
import routeRegister from "@/api/index";
import serverTiming from "@/middleware/serverTiming";
import serveStaticFiles from "@/middleware/serveStatic";
import type { AppBindings, NodeHonoContext } from "@/types/app";
import { getEnv, setEnv } from "@/utils/env";
import { setD1Binding } from "@/db/index";

function createApp() {
  const app = new OpenAPIHono<AppBindings>();

  // Inject env bindings (Cloudflare Workers: c.env is populated, Node.js: c.env is empty)
  app.use("*", async (c, next) => {
    setEnv(c.env);
    // If running in Workers, supply the D1 binding to the db layer
    if ((c.env as any)?.DB) {
      setD1Binding((c.env as any).DB);
    }
    await next();
  });

  serveStaticFiles(app);
  // logHandler(app);
  errorHandler(app);
  corsHandler(app);
  serverTiming(app);
  //   basicAuthHandler(app);
  //   bearerAuthHandler(app);
  //   pathHandler(app);
  docRegister(app);
  const subApp = routeRegister();
  const baseApiPath = getEnv("BASE_API_PATH");
  !baseApiPath && console.error("❌.MISSING ENV: BASE_API_PATH");
  app.route(baseApiPath || "", subApp);

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
