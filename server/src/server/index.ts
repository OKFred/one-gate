import { OpenAPIHono } from "@hono/zod-openapi";
import logHandler from "@/middleware/logger";
import errorHandler from "@/middleware/errorHandler";
import docRegister from "@/middleware/doc/docRegister";
import corsHandler from "@/middleware/cors";
import nodeServer from "@/middleware/nodeServer/index";
import routeRegister from "@/api/index";
import type { AppBindings, NodeHonoContext } from "@/types/app";

async function createApp() {
  const app = new OpenAPIHono<AppBindings>();
  logHandler(app);
  errorHandler(app);
  corsHandler(app);
  //   basicAuthHandler(app);
  //   bearerAuthHandler(app);
  //   pathHandler(app);
  docRegister(app);
  await routeRegister(app);
  nodeServer(app);
  //   normalRouter(app);
  app.get("/", (c: NodeHonoContext) => {
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
