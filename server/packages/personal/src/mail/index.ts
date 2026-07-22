import preferenceApp from "./preference/index.js";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createMailApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/preference", preferenceApp());
  return app;
}

export default createMailApp;
