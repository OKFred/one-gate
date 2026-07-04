import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@/types/app.d";
import config from "./config/index";
import chat from "./chat/index";

const router = () => {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/config", config());
  app.route("/chat", chat());
  return app;
};

export default router;
