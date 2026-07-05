import language from "./language/index";
import region from "./region/index";
import translation from "./translation/index";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/language", language());
  app.route("/region", region());
  app.route("/translation", translation());
  return app;
}
export default createApp;
