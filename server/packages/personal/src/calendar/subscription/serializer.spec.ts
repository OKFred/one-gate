import { describe, expect, it } from "vitest";
import type { CalendarEventRecord } from "../model";
import {
  CALENDAR_SUBSCRIPTION_MAX_BYTES,
  CALENDAR_SUBSCRIPTION_TOKEN_PREFIX,
} from "./model";
import {
  calendarSubscriptionHash,
  isCalendarSubscriptionToken,
  newCalendarSubscriptionToken,
} from "./credential";
import { serializeCalendar, foldCalendarLine } from "./serializer";

const now = Date.UTC(2026, 0, 2, 1, 15);
function event(
  overrides: Partial<CalendarEventRecord> = {}
): CalendarEventRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    ownerUserId: 17,
    requestKey: "00000000-0000-4000-8000-000000000002",
    title: "Synthetic calendar",
    description: null,
    url: "https://example.test/calendar",
    startTimeUtc: now + 60000,
    endTimeUtc: null,
    timeZone: "Asia/Shanghai",
    reminderTimeUtc: null,
    reminderAcknowledgedTimeUtc: null,
    status: "active",
    version: 1,
    createTimeUtc: now,
    updateTimeUtc: now,
    ...overrides,
  };
}
const unfold = (value: string) => value.replace(/\r\n[ \t]/g, "");

describe("iCalendar RFC5545 serializer and dedicated credentials", () => {
  it("folds UTF-8 on octet limits including continuation spaces without splitting scalars", () => {
    const line = "DESCRIPTION:" + "中🙂e\u0301".repeat(100);
    const folded = foldCalendarLine(line);
    expect(unfold(folded)).toBe(line);
    for (const part of folded.split("\r\n")) {
      const bytes = new TextEncoder().encode(part);
      expect(bytes.length).toBeLessThanOrEqual(75);
      expect(new TextDecoder("utf-8", { fatal: true }).decode(bytes)).toBe(
        part
      );
    }
    expect(
      folded
        .split("\r\n")
        .slice(1)
        .every((part) => part.startsWith(" "))
    ).toBe(true);
  });
  it("uses CRLF, stable UIDs, event versions and absolute UTC values without inventing an end", () => {
    const value = serializeCalendar([event({ version: 8 })]);
    expect(value).toContain(
      "UID:00000000-0000-4000-8000-000000000001@one-gate\r\nSEQUENCE:8\r\n"
    );
    expect(value).toContain("DTSTART:20260102T011600Z\r\n");
    expect(value).toContain("DTSTAMP:20260102T011500Z\r\n");
    expect(value).not.toContain("DTEND:");
    expect(value).not.toContain("BEGIN:VALARM");
    expect(value.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(value.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
  });
  it("escapes TEXT so newlines cannot inject components or properties", () => {
    const value = serializeCalendar([
      event({
        title: "One, two; back\\slash\r\nBEGIN:VALARM",
        description: "Line1\nLine2\rLine3",
      }),
    ]);
    expect(unfold(value)).toContain(
      "SUMMARY:One\\, two\\; back\\\\slash\\nBEGIN:VALARM\r\n"
    );
    expect(
      value.split("\r\n").filter((line) => line === "BEGIN:VALARM")
    ).toHaveLength(0);
    expect(
      value.split("\r\n").filter((line) => line === "BEGIN:VEVENT")
    ).toHaveLength(1);
    expect(unfold(value)).toContain("DESCRIPTION:Line1\\nLine2\\nLine3");
  });
  it("keeps a DISPLAY alarm independent of the in-app acknowledgement", () => {
    const source = event({ reminderTimeUtc: now });
    const value = serializeCalendar([source]);
    expect(value).toContain(
      "BEGIN:VALARM\r\nTRIGGER;VALUE=DATE-TIME:20260102T011500Z\r\nACTION:DISPLAY\r\n"
    );
    expect(
      serializeCalendar([
        { ...source, reminderAcknowledgedTimeUtc: now + 30000 },
      ])
    ).toBe(value);
  });
  it("serializes URI properties as URIs and never allows control or non-HTTP URL injection", () => {
    expect(
      serializeCalendar([
        event({ url: "https://example.test/a b?q=one,two;three" }),
      ])
    ).toContain("URL:https://example.test/a%20b?q=one,two;three");
    for (const url of [
      "file:///private",
      "javascript:alert(1)",
      "https://example.test/\r\nBEGIN:VEVENT",
      "https://example.test/" + String.fromCharCode(0),
    ])
      expect(() => serializeCalendar([event({ url })])).toThrow();
  });
  it("rejects corrupt dates, sequence values, Unicode and duplicates instead of dropping them", () => {
    for (const overrides of [
      { startTimeUtc: -1 },
      { startTimeUtc: Number.NaN },
      { startTimeUtc: 253402300800000 },
      { endTimeUtc: now - 1 },
      { reminderTimeUtc: now + 120000 },
      { version: 2147483648 },
      { description: String.fromCharCode(0) },
      { description: String.fromCharCode(0xd800) },
      { timeZone: "Not/AZone" },
      { timeZone: "" },
      { title: "   " },
    ])
      expect(() => serializeCalendar([event(overrides)])).toThrow();
    expect(() => serializeCalendar([event(), event()])).toThrow();
  });
  it("enforces both complete event count and encoded response size limits", () => {
    const events = Array.from({ length: 1000 }, () =>
      event({ id: crypto.randomUUID() })
    );
    expect(
      new TextEncoder().encode(serializeCalendar(events)).byteLength
    ).toBeLessThan(CALENDAR_SUBSCRIPTION_MAX_BYTES);
    expect(() =>
      serializeCalendar([...events, event({ id: crypto.randomUUID() })])
    ).toThrow();
    expect(() =>
      serializeCalendar(
        events.map((row) => ({ ...row, description: "中".repeat(1300) }))
      )
    ).toThrow();
  });
  it("allows a valid empty calendar", () => {
    const value = serializeCalendar([]);
    expect(value.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(value).not.toContain("BEGIN:VEVENT");
    expect(value.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("creates independent canonical 256-bit secrets and a deterministic non-plaintext digest", async () => {
    const first = newCalendarSubscriptionToken(),
      second = newCalendarSubscriptionToken();
    expect(first).not.toBe(second);
    expect(isCalendarSubscriptionToken(first)).toBe(true);
    expect(
      isCalendarSubscriptionToken(
        CALENDAR_SUBSCRIPTION_TOKEN_PREFIX + "A".repeat(42) + "B"
      )
    ).toBe(false);
    expect(isCalendarSubscriptionToken(first + "=")).toBe(false);
    const hash = await calendarSubscriptionHash(first);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(await calendarSubscriptionHash(first));
    expect(hash).not.toContain(first);
  });
});
