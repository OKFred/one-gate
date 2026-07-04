import enterprise from "./enterprise/index.js";
import ai from "./ai/index.js";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

function createBizApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/enterprise", enterprise());
  app.route("/ai", ai());
  return app;
}
export default createBizApp;
