import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@hodor/core/types/app";
import browser from "./browser/index.js";

const router = () => {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/browser", browser());
  return app;
};

export default router;
