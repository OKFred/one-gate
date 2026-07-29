import userConfig from "./user_config/index.js";
import preferenceApp from "./preference/index.js";
import type { AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

export default function createBaseApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/user_config", userConfig());
  app.route("/preference", preferenceApp());
  return app;
}
