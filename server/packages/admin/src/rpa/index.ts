import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@hodor/core/types/app";
import config from "./config/index.js";

const router = () => {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/config", config());
  return app;
};

export default router;
