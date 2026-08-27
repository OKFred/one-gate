import auth from "./auth/index";
import department from "./department/index";
import menu from "./menu/index";
import permission from "./permission/index";
import role from "./role/index";
import role_permission from "./role_permission/index";
import user from "./user/index";
import apiToken from "./api-token/index";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthAppOptions } from "./auth/index.js";

function createApp(options: AuthAppOptions): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/auth", auth(options));
  app.route("/department", department());
  app.route("/menu", menu());
  app.route("/permission", permission());
  app.route("/role", role());
  app.route("/role_permission", role_permission());
  app.route("/user", user());
  app.route("/api-token", apiToken());
  return app;
}
export default createApp;
