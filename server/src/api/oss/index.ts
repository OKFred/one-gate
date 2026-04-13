import config from "./config/index";
import file from "./file/index";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@/types/app";

function createApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/config", config());
  app.route("/file", file());
  return app;
}

export default createApp;
