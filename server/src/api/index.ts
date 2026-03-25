import i18n from "./i18n/index";
import mail from "./mail/index";
import maintenance from "./maintenance/index";
import system from "./system/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

async function createApp(): Promise<App> {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/i18n", await i18n());
  app.route("/mail", await mail());
  app.route("/maintenance", await maintenance());
  app.route("/system", await system());
  return app;
}
export default createApp;
