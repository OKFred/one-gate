import { serveStatic } from "@hono/node-server/serve-static";
import type { App } from "@/types/app.ts";

export default function serveStaticFiles(app: App) {
  if (!process.env.STATIC_FILE_PATH) return;
  app.use("/*", serveStatic({ root: process.env.STATIC_FILE_PATH }));
}
