import { CALENDAR_SUBSCRIPTION_TOKEN_PREFIX } from "./model";

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export function newCalendarSubscriptionToken(): string {
  return (
    CALENDAR_SUBSCRIPTION_TOKEN_PREFIX +
    encode(crypto.getRandomValues(new Uint8Array(32)))
  );
}
export function isCalendarSubscriptionToken(value: string): boolean {
  if (!value.startsWith(CALENDAR_SUBSCRIPTION_TOKEN_PREFIX)) return false;
  const secret = value.slice(CALENDAR_SUBSCRIPTION_TOKEN_PREFIX.length);
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) return false;
  try {
    const bytes = Uint8Array.from(
      atob(secret.replaceAll("-", "+").replaceAll("_", "/") + "="),
      (char) => char.charCodeAt(0)
    );
    return bytes.length === 32 && encode(bytes) === secret;
  } catch {
    return false;
  }
}
export async function calendarSubscriptionHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`one-gate/calendar-subscription/v1:${value}`)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}
