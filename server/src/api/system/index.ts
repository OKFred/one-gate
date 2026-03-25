import auth from "./auth/index";
import department from "./department/index";
import menu from "./menu/index";
import permission from "./permission/index";
import role from "./role/index";
import role_permission from "./role_permission/index";
import user from "./user/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

async function createApp(): Promise<App> {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/auth", await auth());
  app.route("/department", await department());
  app.route("/menu", await menu());
  app.route("/permission", await permission());
  app.route("/role", await role());
  app.route("/role_permission", await role_permission());
  app.route("/user", await user());
  return app;
}
export default createApp;
