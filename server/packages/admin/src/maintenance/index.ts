import loginLog from "./login_log/index";
import cache from "./cache/index";
import compliance from "./compliance/index";
import init from "./init/index";
import cron from "./cron/index";
import apiTask from "./api-task/index";
import apiDocs from "./api-docs/index";
import recycleBin from "./recycle-bin/index";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/login_log", loginLog());
  app.route("/cache", cache());
  app.route("/compliance", compliance());
  app.route("/init", init());
  app.route("/cron", cron());
  app.route("/api-task", apiTask());
  app.route("/api-docs", apiDocs());
  app.route("/recycle-bin", recycleBin());
  return app;
}
export default createApp;
