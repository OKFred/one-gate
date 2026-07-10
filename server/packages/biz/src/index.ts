import enterprise from "./enterprise/index.js";
import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createBizApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/enterprise", enterprise());
  return app;
}
export default createBizApp;
