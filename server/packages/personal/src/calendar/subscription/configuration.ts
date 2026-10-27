import { getEnv } from "@hodor/core/utils/env";

/** Deployment configuration owns the authority; request Host/Forwarded headers never create links. */
export function calendarSubscriptionOrigin(): string | null {
  const value = getEnv("CALENDAR_SUBSCRIPTION_ORIGIN");
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/" ||
      !parsed.hostname ||
      ![parsed.origin, `${parsed.origin}/`].includes(value)
    )
      return null;
    return parsed.origin;
  } catch {
    return null;
  }
}
