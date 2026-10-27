import { OpenAPIHono } from "@hono/zod-openapi";
import encapsulation from "@hodor/core/middleware/encapsulation";
import type { AppBindings } from "@hodor/core/types/app";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service";

export default function createCalendarSubscriptionApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.use("*", async (context, next) => {
    context.header("Cache-Control", "private, no-store");
    context.header("CDN-Cache-Control", "no-store");
    context.header("Cloudflare-CDN-Cache-Control", "no-store");
    context.header("Referrer-Policy", "no-referrer");
    context.header("X-Content-Type-Options", "nosniff");
    await next();
  });
  app.route(
    "/",
    encapsulation(
      service,
      "personal.calendar.subscription" satisfies BusinessKey
    )
  );
  return app;
}
