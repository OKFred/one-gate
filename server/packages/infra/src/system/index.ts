import auth from "./auth/index";
import department from "./department/index";
import menu from "./menu/index";
import permission from "./permission/index";
import role from "./role/index";
import role_permission from "./role_permission/index";
import user from "./user/index";
import schema_form from "./schema_form/index";
import schema_form_data from "./schema_form_data/index";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/auth", auth());
  app.route("/department", department());
  app.route("/menu", menu());
  app.route("/permission", permission());
  app.route("/role", role());
  app.route("/role_permission", role_permission());
  app.route("/user", user());
  app.route("/schema_form", schema_form());
  app.route("/schema_form_data", schema_form_data());
  return app;
}
export default createApp;
