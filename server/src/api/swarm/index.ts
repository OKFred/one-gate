import docker from "./docker/index";
import nodes from "./nodes/index";
import type { App, AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";

function createApp(): App {
  const app = new OpenAPIHono<AppBindings>();
  app.route("/docker", docker());
  app.route("/nodes", nodes());
  return app;
}

export default createApp;
