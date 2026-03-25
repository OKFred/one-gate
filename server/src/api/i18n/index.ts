import language from "./language/index";
import region from "./region/index";
import translation from "./translation/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

async function createApp(): Promise<App> {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/language", await language());
  app.route("/region", await region());
  app.route("/translation", await translation());
  return app;
}
export default createApp;
