import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@hodor/core/types/app";
import config from "./config/index";
import chat from "./chat/index";
import search from "./search/index";
import openai from "./openai/index";

const router = () => {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/config", config());
  app.route("/chat", chat());
  app.route("/search", search());
  app.route("/openai", openai());
  app.route("/v1", openai());
  return app;
};

export default router;
