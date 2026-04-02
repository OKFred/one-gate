import { timing } from "hono/timing";
import type { App } from "@/types/app.ts";
import { getEnv } from "@/utils/env";

export default function serverTiming(app: App) {
  app.use(
    getEnv("BASE_API_PATH") + "/*",
    timing({
      enabled: (c) => c.req.method === "POST",
    })
  );
}
