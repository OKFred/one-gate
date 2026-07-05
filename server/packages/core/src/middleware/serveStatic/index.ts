import { serveStatic } from "@hono/node-server/serve-static";
import type { App } from "../../types/app.ts";

import { getEnv } from "../../utils/env";

export default function serveStaticFiles(app: App) {
  if (!getEnv("STATIC_FILE_PATH")) return;
  app.use("/*", serveStatic({ root: getEnv("STATIC_FILE_PATH") }));
}
