import infra from "./infra/index.js";
import biz from "./biz/index.js";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/infra", infra());
  app.route("/biz", biz());
  return app;
}
export default createApp;
