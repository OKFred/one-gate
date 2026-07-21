import organization from "./organization/index.js";
import executive from "./executive/index.js";
import base from "./base/index.js";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createEnterpriseApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/organization", organization());
  app.route("/executive", executive());
  app.route("/base", base());
  return app;
}
export default createEnterpriseApp;
