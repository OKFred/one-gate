import attendance from "./attendance/index";
import workflow from "./workflow/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/attendance", attendance());
  app.route("/workflow", workflow());
  return app;
}

export default createApp;
