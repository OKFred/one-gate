import audit_login from "./audit_login/index";
import cache from "./cache/index";
import compliance from "./compliance/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/audit_login", audit_login());
  app.route("/cache", cache());
  app.route("/compliance", compliance());
  return app;
}
export default createApp;
