import account from "./account/index";
import action from "./action/index";
import log from "./log/index";
import template from "./template/index";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/account", account());
  app.route("/action", action());
  app.route("/log", log());
  app.route("/template", template());
  return app;
}
export default createApp;
