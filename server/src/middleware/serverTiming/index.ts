import { timing } from "hono/timing";
import type { App } from "@/types/app.ts";

export default function serverTiming(app: App) {
  app.use(
    process.env.BASE_API_PATH + "/*",
    timing({
      enabled: (c) => c.req.method === "POST",
    })
  );
}
