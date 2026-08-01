import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@hodor/core/types/app";

import device from "./device/index.js";
import appModule from "./app/index.js";
import appVersion from "./app-version/index.js";
import deviceApp from "./device-app/index.js";
import asyncTask from "./async-task/index.js";

function createMobileApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/device", device());
  app.route("/app", appModule());
  app.route("/app-version", appVersion());
  app.route("/device-app", deviceApp());
  app.route("/async-task", asyncTask());
  return app;
}

export default createMobileApp;
