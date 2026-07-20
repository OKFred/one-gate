import config from "./config/index.js";
import log from "./log/index.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@hodor/core/types/app";

function createApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/config", config());
  app.route("/log", log());
  return app;
}

export default createApp;
