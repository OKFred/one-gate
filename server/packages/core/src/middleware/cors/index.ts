import type { App } from "../../types/app";
import { cors } from "hono/cors";
import { getEnv } from "../../utils/env";

export default function corsHandler(app: App) {
  app.options(getEnv("BASE_API_PATH") + "/*", cors());
  app.use(getEnv("BASE_API_PATH") + "/*", cors());
}
