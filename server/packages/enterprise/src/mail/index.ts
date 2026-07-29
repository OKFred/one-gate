import edmApp from "./edm/index.js";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createMailApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/edm", edmApp());
  return app;
}

export default createMailApp;
