import type { App } from "@/types/app.ts";
import { cors } from "hono/cors";

export default function corsHandler(app: App) {
  app.options(process.env.BASE_API_PATH + "/*", cors());
  app.use(process.env.BASE_API_PATH + "/*", cors());
}
