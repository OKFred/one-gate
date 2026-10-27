import type { App, Context } from "@hodor/core/types/app";
import { calendarSubscriptionOrigin } from "./configuration";
import {
  calendarSubscriptionHash,
  isCalendarSubscriptionToken,
} from "./credential";
import {
  CALENDAR_SUBSCRIPTION_MAX_EVENTS,
  CALENDAR_SUBSCRIPTION_PATH,
} from "./model";
import { getSubscriptionRepository } from "./repository";
import { serializeCalendar } from "./serializer";

function headers(context: Context): void {
  context.header("Cache-Control", "private, no-store");
  context.header("CDN-Cache-Control", "no-store");
  context.header("Cloudflare-CDN-Cache-Control", "no-store");
  context.header("Referrer-Policy", "no-referrer");
  context.header("X-Content-Type-Options", "nosniff");
}
function reject(
  context: Context,
  status: 400 | 401 | 404 | 405 | 503,
  message: string
): Response {
  return context.newResponse(
    context.req.method === "HEAD" ? null : message,
    status,
    { "Content-Type": "text/plain; charset=utf-8" }
  );
}
/** External iCalendar protocol resource: deliberately outside the JWT/TOTP business POST API. */
export function registerCalendarSubscriptionProtocol(app: App): void {
  app.all(CALENDAR_SUBSCRIPTION_PATH, async (context) => {
    headers(context);
    const url = new URL(context.req.url);
    if (url.pathname !== CALENDAR_SUBSCRIPTION_PATH)
      return reject(context, 404, "Not found");
    if (!["GET", "HEAD"].includes(context.req.method)) {
      context.header("Allow", "GET, HEAD");
      return reject(context, 405, "Method not allowed");
    }
    if (!calendarSubscriptionOrigin())
      return reject(context, 503, "Calendar subscription is unavailable");
    const entries = [...url.searchParams.entries()];
    if (
      entries.length !== 1 ||
      entries[0][0] !== "token" ||
      url.search !== `?token=${encodeURIComponent(entries[0][1])}`
    )
      return reject(context, 400, "Invalid calendar subscription request");
    const token = entries[0][1];
    if (!isCalendarSubscriptionToken(token))
      return reject(context, 401, "Unauthorized");
    try {
      const hash = await calendarSubscriptionHash(token);
      const repository = getSubscriptionRepository();
      const credential = await repository.credential(hash);
      if (!credential) return reject(context, 401, "Unauthorized");
      // The second statement revalidates token/version/owner in the same snapshot as its event join.
      const feed = await repository.feed(
        hash,
        credential,
        CALENDAR_SUBSCRIPTION_MAX_EVENTS + 1
      );
      if (!feed.authorized) return reject(context, 401, "Unauthorized");
      const body = serializeCalendar(feed.events);
      context.header("Content-Type", "text/calendar; charset=utf-8");
      context.header("Content-Disposition", 'inline; filename="one-gate.ics"');
      context.header(
        "Content-Length",
        String(new TextEncoder().encode(body).byteLength)
      );
      return context.newResponse(
        context.req.method === "HEAD" ? null : body,
        200
      );
    } catch {
      context.header("Retry-After", "300");
      return reject(context, 503, "Calendar subscription is unavailable");
    }
  });
  app.all(`${CALENDAR_SUBSCRIPTION_PATH}/*`, (context) => {
    headers(context);
    return reject(context, 404, "Not found");
  });
}
