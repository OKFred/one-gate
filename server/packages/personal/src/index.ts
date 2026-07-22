import profile from "./profile/index.js";
import base from "./base/index.js";
import mailApp from "./mail/index.js";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createPersonalApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/profile", profile());
  app.route("/base", base());
  app.route("/mail", mailApp());
  return app;
}
export default createPersonalApp;
