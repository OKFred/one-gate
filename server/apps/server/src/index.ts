import { OpenAPIHono } from "@hono/zod-openapi";
import logHandler from "@hodor/core/middleware/logger/index.js";
import errorHandler from "@hodor/core/middleware/errorHandler/index.js";
import docRegister from "@hodor/core/middleware/doc/docRegister.js";
import corsHandler from "@hodor/core/middleware/cors/index.js";
import serverTiming from "@hodor/core/middleware/serverTiming/index.js";
import serveStaticFiles from "@hodor/core/middleware/serveStatic/index.js";
import type { AppBindings, Context, ResJson } from "@hodor/core/types/app.js";
import { getEnv } from "@hodor/core/utils/env.js";
import createAdminApp from "@hodor/admin/index.js";
import createEnterpriseApp from "@hodor/enterprise/index.js";
import createPersonalApp from "@hodor/personal/index.js";
import type { TotpGateCenterResolver } from "@hodor/admin/system/auth/totp-gate/index.js";
import { registerTotpGateMiddleware } from "./security/totp-gate.js";

export interface ServerAppOptions {
  readonly resolveTotpGateCenter: TotpGateCenterResolver;
}

function createApp(options: ServerAppOptions) {
  const app = new OpenAPIHono<AppBindings>();

  serveStaticFiles(app);
  errorHandler(app);
  logHandler(app);
  corsHandler(app);
  serverTiming(app);

  const baseApiPath = getEnv("BASE_API_PATH") || "";
  registerTotpGateMiddleware(app, {
    baseApiPath,
    resolveTotpGateCenter: options.resolveTotpGateCenter,
  });

  const apiApp = new OpenAPIHono<AppBindings>();
  apiApp.route(
    "/admin",
    createAdminApp({
      resolveTotpGateCenter: options.resolveTotpGateCenter,
    })
  );
  apiApp.route("/enterprise", createEnterpriseApp());
  apiApp.route("/personal", createPersonalApp());

  if (!baseApiPath) {
    console.error("❌.MISSING ENV: BASE_API_PATH");
  }
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
  if (getEnv("NODE_ENV") !== "production") {
    docRegister(app);
  }
  return app;
}
export default createApp;
