import type { CalendarEventRecord } from "../model";
import {
  CALENDAR_SUBSCRIPTION_MAX_BYTES,
  CALENDAR_SUBSCRIPTION_MAX_EVENTS,
} from "./model";
import { SubscriptionError, subscriptionError } from "./errors";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const invalid = () => subscriptionError(SubscriptionError.INVALID_DATA);

function hasControls(value: string, allowTextWhitespace: boolean): boolean {
  return Array.from(value).some((point) => {
    const code = point.codePointAt(0)!;
    return (
      code === 127 ||
      (code < 32 && !(allowTextWhitespace && [9, 10, 13].includes(code)))
    );
  });
}

function text(value: string): string {
  if (
    typeof value !== "string" ||
    hasControls(value, true) ||
    decoder.decode(encoder.encode(value)) !== value
  )
    throw invalid();
  return value
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function dateTime(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0 || value > 253402300799999)
    throw invalid();
  return (
    new Date(value)
      .toISOString()
      .slice(0, 19)
      .replaceAll("-", "")
      .replaceAll(":", "") + "Z"
  );
}

/** RFC 5545 counts octets, including the continuation space, and never splits a Unicode scalar. */
export function foldCalendarLine(line: string): string {
  const chunks: string[] = [];
  let current = "";
  let bytes = 0;
  for (const point of line) {
    const code = point.codePointAt(0)!;
    const width = code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    if (bytes + width > 75) {
      chunks.push(current);
      current = " ";
      bytes = 1;
    }
    current += point;
    bytes += width;
  }
  chunks.push(current);
  return chunks.join("\r\n");
}

/** Only complete snapshots are emitted. An oversized or corrupt event fails the entire feed. */
export function serializeCalendar(
  events: readonly CalendarEventRecord[]
): string {
  if (events.length > CALENDAR_SUBSCRIPTION_MAX_EVENTS)
    throw subscriptionError(SubscriptionError.TOO_LARGE);
  const lines: string[] = [];
  let bytes = 0;
  const add = (line: string) => {
    const folded = foldCalendarLine(line) + "\r\n";
    bytes += encoder.encode(folded).byteLength;
    if (bytes > CALENDAR_SUBSCRIPTION_MAX_BYTES)
      throw subscriptionError(SubscriptionError.TOO_LARGE);
    lines.push(folded);
  };
  for (const line of [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//One Gate//Private Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:One Gate",
  ])
    add(line);
  const seen = new Set<string>();
  for (const event of events) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        event.id
      ) ||
      seen.has(event.id) ||
      event.status !== "active" ||
      typeof event.title !== "string" ||
      !event.title.trim() ||
      event.title.length > 160 ||
      !Number.isSafeInteger(event.version) ||
      event.version < 1 ||
      event.version > 2147483647 ||
      (event.description !== null &&
        (typeof event.description !== "string" ||
          event.description.length > 4000)) ||
      (event.url !== null &&
        (typeof event.url !== "string" || event.url.length > 2048)) ||
      typeof event.timeZone !== "string" ||
      !event.timeZone ||
      event.timeZone.length > 100 ||
      (event.endTimeUtc !== null && event.endTimeUtc < event.startTimeUtc) ||
      (event.reminderTimeUtc !== null &&
        event.reminderTimeUtc > event.startTimeUtc)
    )
      throw invalid();
    seen.add(event.id);
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: event.timeZone });
    } catch {
      throw invalid();
    }
    add("BEGIN:VEVENT");
    add(`UID:${event.id}@one-gate`);
    add(`SEQUENCE:${event.version}`);
    add(`DTSTAMP:${dateTime(event.updateTimeUtc)}`);
    add(`CREATED:${dateTime(event.createTimeUtc)}`);
    add(`LAST-MODIFIED:${dateTime(event.updateTimeUtc)}`);
    add(`DTSTART:${dateTime(event.startTimeUtc)}`);
    if (event.endTimeUtc !== null) add(`DTEND:${dateTime(event.endTimeUtc)}`);
    add(`SUMMARY:${text(event.title)}`);
    if (event.description !== null)
      add(`DESCRIPTION:${text(event.description)}`);
    if (event.url !== null) {
      text(event.url);
      if (hasControls(event.url, false)) throw invalid();
      let url: URL;
      try {
        url = new URL(event.url);
      } catch {
        throw invalid();
      }
      if (!["http:", "https:"].includes(url.protocol)) throw invalid();
      add(`URL:${url.href}`);
    }
    add("STATUS:CONFIRMED");
    if (event.reminderTimeUtc !== null) {
      add("BEGIN:VALARM");
      add(`TRIGGER;VALUE=DATE-TIME:${dateTime(event.reminderTimeUtc)}`);
      add("ACTION:DISPLAY");
      add(`DESCRIPTION:${text(event.title)}`);
      add("END:VALARM");
    }
    add("END:VEVENT");
  }
  add("END:VCALENDAR");
  return lines.join("");
}
