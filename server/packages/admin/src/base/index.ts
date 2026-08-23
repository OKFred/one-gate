import sys_config from "./sys_config/index.js";
import log from "./log/index.js";
import webhookConfig from "./webhook_config/index.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@hodor/core/types/app";

function createApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/sys_config", sys_config());
  app.route("/log", log());
  app.route("/webhook_config", webhookConfig());
  return app;
}

export default createApp;
