import organization from "./organization/index.js";
import executive from "./executive/index.js";
import mailApp from "./mail/index.js";
import tenantApp from "./tenant/index.js";
import assetApp from "./asset/index.js";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createEnterpriseApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/organization", organization());
  app.route("/executive", executive());
  app.route("/mail", mailApp());
  app.route("/tenant", tenantApp());
  app.route("/asset", assetApp());
  return app;
}
export default createEnterpriseApp;
