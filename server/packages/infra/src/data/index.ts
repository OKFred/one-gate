import schema_form_data from "./schema_form_data/index.js";
import schema_form from "./schema_form/index.js";
import oss from "./oss/index.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { App, AppBindings } from "@hodor/core/types/app";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/schema_form_data", schema_form_data());
  app.route("/schema_form", schema_form());
  app.route("/oss", oss());
  return app;
}

export default createApp;
