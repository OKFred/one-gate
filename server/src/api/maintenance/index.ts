import audit_login from "./audit_login/index";
import cache from "./cache/index";
import compliance from "./compliance/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

async function createApp(): Promise<App> {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/audit_login", await audit_login());
  app.route("/cache", await cache());
  app.route("/compliance", await compliance());
  return app;
}
export default createApp;
