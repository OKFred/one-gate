import account from "./account/index";
import action from "./action/index";
import log from "./log/index";
import template from "./template/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

async function createApp(): Promise<App> {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/account", await account());
  app.route("/action", await action());
  app.route("/log", await log());
  app.route("/template", await template());
  return app;
}
export default createApp;
