import base from "./base/index.js";
import health from "./health/index.js";
import financial from "./financial/index.js";
import family from "./family/index.js";
import social from "./social/index.js";
import calendar from "./calendar/index.js";

import type { App, AppBindings } from "@hodor/core/types/app";
import { OpenAPIHono } from "@hono/zod-openapi";

function createPersonalApp(): App {
  const app = new OpenAPIHono<AppBindings>();

  app.route("/base", base());
  app.route("/health", health());
  app.route("/finance", financial());
  app.route("/family", family());
  app.route("/social", social());
  app.route("/calendar", calendar());

  return app;
}
export default createPersonalApp;
export { registerCalendarSubscriptionProtocol } from "./calendar/subscription/protocol.js";
