import userConfig from "./user_config/index.js";
import type { AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

export default function createBaseApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/user_config", userConfig());
  return app;
}
