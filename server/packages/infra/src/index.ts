import i18n from "./i18n/index.js";
import mail from "./mail/index.js";
import maintenance from "./maintenance/index.js";
import data from "./data/index.js";
import oss from "./data/oss/index.js";
import system from "./system/index.js";
import swarm from "./swarm/index.js";
import ai from "./ai/index.js";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";
import { initInfraRegistry } from "./register.js";

function createInfraApp(): App {
  initInfraRegistry();
  const app = new OpenAPIHono<AppBindings>();
  app.route("/i18n", i18n());
  app.route("/mail", mail());
  app.route("/maintenance", maintenance());
  app.route("/data", data());
  app.route("/oss", oss());
  app.route("/system", system());
  app.route("/swarm", swarm());
  app.route("/ai", ai());
  return app;
}
export default createInfraApp;
