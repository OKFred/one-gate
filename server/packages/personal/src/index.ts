import profile from "./profile/index.js";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createPersonalApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/profile", profile());
  return app;
}
export default createPersonalApp;
