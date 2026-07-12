import { OpenAPIHono } from "@hono/zod-openapi";
import logHandler from "@hodor/core/middleware/logger/index.js";
import errorHandler from "@hodor/core/middleware/errorHandler/index.js";
import docRegister from "@hodor/core/middleware/doc/docRegister.js";
import corsHandler from "@hodor/core/middleware/cors/index.js";
import serverTiming from "@hodor/core/middleware/serverTiming/index.js";
import serveStaticFiles from "@hodor/core/middleware/serveStatic/index.js";
import { storageMiddleware } from "@hodor/core/utils/storage/index.js";
import type { AppBindings, Context, ResJson } from "@hodor/core/types/app.js";
import { getEnv } from "@hodor/core/utils/env.js";
import createAdminApp from "@hodor/admin/index.js";
import createEnterpriseApp from "@hodor/enterprise/index.js";
import createPersonalApp from "@hodor/personal/index.js";

function createApp() {
  const app = new OpenAPIHono<AppBindings>();

  serveStaticFiles(app);
  storageMiddleware(app);
  errorHandler(app);
  corsHandler(app);
  serverTiming(app);
  logHandler(app);
  getEnv("NODE_ENV") !== "production" && docRegister(app);

  const apiApp = new OpenAPIHono<AppBindings>();
  apiApp.route("/admin", createAdminApp());
  apiApp.route("/enterprise", createEnterpriseApp());
  apiApp.route("/personal", createPersonalApp());

  const baseApiPath = getEnv("BASE_API_PATH");
  !baseApiPath && console.error("❌.MISSING ENV: BASE_API_PATH");
  app.route(baseApiPath || "", apiApp);

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
