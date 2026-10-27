import { OpenAPIHono } from "@hono/zod-openapi";
import encapsulation from "@hodor/core/middleware/encapsulation";
import type { AppBindings } from "@hodor/core/types/app";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service";
import subscription from "./subscription/index";

export default function createCalendarApp() {
  const app = new OpenAPIHono<AppBindings>();
  app.use("*", async (context, next) => {
    context.header("Cache-Control", "private, no-store");
    context.header("Vary", "Authorization, Cookie", { append: true });
    await next();
  });
  app.route("/subscription", subscription());
  app.route(
    "/",
    encapsulation(service, "personal.calendar" satisfies BusinessKey)
  );
  return app;
}
