import bizConfig from "./biz_config/index.js";
import type { AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

export default function createBaseApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/biz_config", bizConfig());
  return app;
}
