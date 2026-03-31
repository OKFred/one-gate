import i18n from "./i18n/index";
// import mail from "./mail/index";
import maintenance from "./maintenance/index";
import system from "./system/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/i18n", i18n());
  // app.route("/mail", mail());
  app.route("/maintenance", maintenance());
  app.route("/system", system());
  return app;
}
export default createApp;
