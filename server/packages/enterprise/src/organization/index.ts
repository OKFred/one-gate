import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@hodor/core/types/app";
import attendance from "./attendance/index.js";

const router = () => {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/attendance", attendance());
  return app;
};

export default router;
