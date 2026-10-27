import { HTTPException } from "hono/http-exception";

export const SubscriptionError = {
  UNAVAILABLE: "CALENDAR_SUBSCRIPTION_UNAVAILABLE",
  STATE_CONFLICT: "CALENDAR_SUBSCRIPTION_STATE_CONFLICT",
  TOO_LARGE: "CALENDAR_SUBSCRIPTION_TOO_LARGE",
  INVALID_DATA: "CALENDAR_SUBSCRIPTION_INVALID_DATA",
} as const;
type SubscriptionErrorCode =
  (typeof SubscriptionError)[keyof typeof SubscriptionError];
const presentations = {
  CALENDAR_SUBSCRIPTION_UNAVAILABLE: [
    503,
    "errorHandler.personal.calendar.subscription.unavailable",
  ],
  CALENDAR_SUBSCRIPTION_STATE_CONFLICT: [
    409,
    "errorHandler.personal.calendar.subscription.stateConflict",
  ],
  CALENDAR_SUBSCRIPTION_TOO_LARGE: [
    503,
    "errorHandler.personal.calendar.subscription.tooLarge",
  ],
  CALENDAR_SUBSCRIPTION_INVALID_DATA: [
    503,
    "errorHandler.personal.calendar.subscription.invalidData",
  ],
} as const;
export function subscriptionError(code: SubscriptionErrorCode): HTTPException {
  const [status, message] = presentations[code];
  return new HTTPException(status, { message, cause: { error: { code } } });
}
