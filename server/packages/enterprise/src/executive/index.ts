import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@hodor/core/types/app";
import workflow from "./workflow/index.js";

const router = () => {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/workflow", workflow());
  return app;
};

export default router;
