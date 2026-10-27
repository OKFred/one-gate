import { OpenAPIHono } from "@hono/zod-openapi";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { AppBindings } from "@hodor/core/types/app";
import { setEnv } from "@hodor/core/utils/env";
import { ensureAdminRegistry } from "@hodor/admin/register";
import { calendarActor } from "../calendar.contract-tests";
import type { CalendarEventInsert } from "../model";
import {
  CALENDAR_SUBSCRIPTION_MAX_EVENTS,
  CALENDAR_SUBSCRIPTION_PATH,
} from "./model";
import { SubscriptionError } from "./errors";
import {
  calendarSubscriptionHash,
  isCalendarSubscriptionToken,
  newCalendarSubscriptionToken,
} from "./credential";
import { getSubscriptionRepository } from "./repository";
import { registerCalendarSubscriptionProtocol } from "./protocol";
import {
  revokeSubscription,
  rotateSubscription,
  subscriptionStatus,
} from "./service";

const origin = "https://calendar.example.test";
const now = Date.UTC(2026, 0, 2, 1, 15);
export function subscriptionEvent(
  ownerUserId = 17,
  overrides: Partial<CalendarEventInsert> = {}
): CalendarEventInsert {
  return {
    id: crypto.randomUUID(),
    ownerUserId,
    requestKey: crypto.randomUUID(),
    title: "Synthetic private schedule",
    description: null,
    url: "https://example.test/calendar",
    startTimeUtc: now + 60_000,
    endTimeUtc: null,
    timeZone: "Asia/Shanghai",
    reminderTimeUtc: now,
    reminderAcknowledgedTimeUtc: null,
    status: "active",
    version: 1,
    createTimeUtc: now,
    updateTimeUtc: now,
    ...overrides,
  };
}
interface SubscriptionFixture {
  reset(): Promise<void>;
  run<T>(operation: () => Promise<T>): Promise<T>;
  insertMany(rows: CalendarEventInsert[]): Promise<void>;
  setEnabled(owner: number, enabled: boolean): Promise<void>;
  deleteOwner(owner: number): Promise<void>;
}
export function subscriptionContractTests(fixture: SubscriptionFixture): void {
  describe("private ICS subscription contract", () => {
    const owner = calendarActor(17);
    const outsider = calendarActor(18, true);
    const run = <T>(operation: () => Promise<T>) => fixture.run(operation);
    const app = new OpenAPIHono<AppBindings>();
    registerCalendarSubscriptionProtocol(app);
    const request = (url: string, method = "GET", headers?: HeadersInit) =>
      run(() => app.request(url, { method, headers }));
    const tokenOf = (url: string) => new URL(url).searchParams.get("token")!;
    const rotate = (expectedVersion: number | null = null) =>
      run(() => rotateSubscription({ expectedVersion }, owner));
    beforeAll(() => ensureAdminRegistry());
    beforeEach(async () => {
      setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: origin });
      await fixture.reset();
      vi.spyOn(Date, "now").mockReturnValue(now);
    });
    afterEach(() => {
      vi.restoreAllMocks();
      setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: "" });
    });

    it("returns an empty status without exposing another owner and rejects machine identities", async () => {
      expect(await run(() => subscriptionStatus({}, owner))).toEqual({
        configured: true,
        enabled: false,
        version: null,
        updatedTimeUtc: null,
      });
      await rotate();
      expect(await run(() => subscriptionStatus({}, outsider))).toEqual({
        configured: true,
        enabled: false,
        version: null,
        updatedTimeUtc: null,
      });
      for (const actor of [
        undefined,
        { ...owner, principal: { kind: "api_token" as const, tokenId: 17 } },
      ]) {
        await expect(
          run(() => subscriptionStatus({}, actor))
        ).rejects.toBeDefined();
        await expect(
          run(() => rotateSubscription({ expectedVersion: null }, actor))
        ).rejects.toBeDefined();
        await expect(
          run(() => revokeSubscription({ expectedVersion: null }, actor))
        ).rejects.toBeDefined();
      }
    });
    it("stores only the digest and returns the generated link once from a fixed authority", async () => {
      const result = await rotate();
      const token = tokenOf(result.subscriptionUrl);
      expect(
        result.subscriptionUrl.startsWith(
          origin + CALENDAR_SUBSCRIPTION_PATH + "?token="
        )
      ).toBe(true);
      expect(isCalendarSubscriptionToken(token)).toBe(true);
      const record = await run(() => getSubscriptionRepository().find(17));
      expect(record?.tokenHash).toBe(await calendarSubscriptionHash(token));
      expect(JSON.stringify(record)).not.toContain(token);
      expect(await run(() => subscriptionStatus({}, owner))).toEqual({
        configured: true,
        enabled: true,
        version: 1,
        updatedTimeUtc: now,
      });
      expect(await run(() => subscriptionStatus({}, owner))).not.toHaveProperty(
        "subscriptionUrl"
      );
    });
    it("uses atomic initial and update CAS; concurrent losers never receive a valid new secret", async () => {
      const first = await Promise.allSettled([rotate(), rotate()]);
      expect(
        first.filter((result) => result.status === "fulfilled")
      ).toHaveLength(1);
      expect(
        first.filter((result) => result.status === "rejected")
      ).toHaveLength(1);
      const winner = first.find((result) => result.status === "fulfilled");
      if (winner?.status !== "fulfilled") throw Error("No successful rotation");
      const next = await Promise.allSettled([rotate(1), rotate(1)]);
      expect(
        next.filter((result) => result.status === "fulfilled")
      ).toHaveLength(1);
      expect((await request(winner.value.subscriptionUrl)).status).toBe(401);
      const nextWinner = next.find((result) => result.status === "fulfilled");
      if (nextWinner?.status !== "fulfilled")
        throw Error("No second successful rotation");
      expect(nextWinner.value.version).toBe(2);
      expect((await request(nextWinner.value.subscriptionUrl)).status).toBe(
        200
      );
      await expect(rotate(1)).rejects.toMatchObject({
        status: 409,
        cause: { error: { code: SubscriptionError.STATE_CONFLICT } },
      });
    });
    it("revokes while unconfigured, creates a first disabled CAS state and keeps old links invalid", async () => {
      const first = await rotate();
      setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: "" });
      await expect(rotate(1)).rejects.toMatchObject({ status: 503 });
      expect(
        await run(() => revokeSubscription({ expectedVersion: 1 }, owner))
      ).toEqual({ version: 2, updatedTimeUtc: now });
      expect(
        await run(() => revokeSubscription({ expectedVersion: null }, outsider))
      ).toEqual({ version: 1, updatedTimeUtc: now });
      setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: origin });
      expect((await request(first.subscriptionUrl)).status).toBe(401);
      expect(await run(() => subscriptionStatus({}, owner))).toMatchObject({
        enabled: false,
        version: 2,
      });
    });
    it("exports only this owner's complete active events beyond ordinary list limits and preserves UID/version", async () => {
      const event = subscriptionEvent(17, {
        title: "Owned far future event",
        startTimeUtc: now + 800 * 86400000,
        version: 7,
      });
      await fixture.insertMany([
        event,
        subscriptionEvent(18, { title: "Another owner" }),
        subscriptionEvent(17, {
          title: "Cancelled event",
          status: "cancelled",
        }),
      ]);
      const { subscriptionUrl } = await rotate();
      const response = await request(subscriptionUrl);
      const body = await response.text();
      expect(response.status).toBe(200);
      expect(body).toContain(`UID:${event.id}@one-gate\r\nSEQUENCE:7`);
      expect(body).toContain("Owned far future event");
      expect(body).not.toContain("Another owner");
      expect(body).not.toContain("Cancelled event");
      expect(body).not.toContain("ownerUserId");
      expect(body).not.toContain(tokenOf(subscriptionUrl));
    });
    it("returns the same unauthorized response for a guessed, revoked, disabled or deleted owner credential", async () => {
      const { subscriptionUrl } = await rotate();
      const guessed = new URL(subscriptionUrl);
      guessed.searchParams.set("token", newCalendarSubscriptionToken());
      const denied = await request(guessed.href);
      expect(denied.status).toBe(401);
      expect(await denied.text()).toBe("Unauthorized");
      await fixture.setEnabled(17, false);
      const repository = await run(async () => getSubscriptionRepository());
      const feedSpy = vi.spyOn(repository, "feed");
      const disabled = await request(subscriptionUrl);
      expect(disabled.status).toBe(401);
      expect(await disabled.text()).toBe("Unauthorized");
      expect(feedSpy).not.toHaveBeenCalled();
      await fixture.setEnabled(17, true);
      expect((await request(subscriptionUrl)).status).toBe(200);
      await fixture.deleteOwner(17);
      expect((await request(subscriptionUrl)).status).toBe(401);
    });
    it("revalidates the credential and owner when reading its event snapshot", async () => {
      const { subscriptionUrl } = await rotate();
      const hash = await calendarSubscriptionHash(tokenOf(subscriptionUrl));
      const repo = await run(async () => getSubscriptionRepository());
      const credential = await run(() => repo.credential(hash));
      if (!credential) throw Error("Missing credential");
      await run(() => revokeSubscription({ expectedVersion: 1 }, owner));
      expect(await run(() => repo.feed(hash, credential, 1001))).toEqual({
        authorized: false,
        events: [],
      });
    });
    it("does not read events for malformed or unknown token requests", async () => {
      const repo = await run(async () => getSubscriptionRepository());
      const credentialSpy = vi.spyOn(repo, "credential");
      const feedSpy = vi.spyOn(repo, "feed");
      for (const suffix of [
        "",
        "?token=wrong",
        "?token=a&token=b",
        "?token=a&ownerUserId=17",
        "?other=a",
        "?token=a&",
      ])
        expect([400, 401]).toContain(
          (await request(origin + CALENDAR_SUBSCRIPTION_PATH + suffix)).status
        );
      expect(credentialSpy).not.toHaveBeenCalled();
      expect(feedSpy).not.toHaveBeenCalled();
      expect(
        (
          await request(
            origin +
              CALENDAR_SUBSCRIPTION_PATH +
              "?token=" +
              newCalendarSubscriptionToken()
          )
        ).status
      ).toBe(401);
      expect(credentialSpy).toHaveBeenCalledOnce();
      expect(feedSpy).not.toHaveBeenCalled();
    });
    it("keeps the feed exact and read-only; management remains outside all auth bypass classes", async () => {
      const { subscriptionUrl } = await rotate();
      for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
        const response = await request(subscriptionUrl, method);
        expect(response.status).toBe(405);
        expect(response.headers.get("allow")).toBe("GET, HEAD");
      }
      for (const path of [
        "/calendar-subscription.ics/",
        "/calendar-subscription.ics/nested",
        "/calendar-subscription.ics-other",
        "/calendar-subscription%2eics",
      ])
        expect(
          (await request(origin + path + new URL(subscriptionUrl).search))
            .status
        ).toBe(404);
    });
    it("does not return a successful stale conditional response after revocation and keeps HEAD private", async () => {
      const { subscriptionUrl } = await rotate();
      const get = await request(subscriptionUrl);
      const body = await get.text();
      const head = await request(subscriptionUrl, "HEAD");
      expect(head.status).toBe(200);
      expect(await head.text()).toBe("");
      expect(head.headers.get("content-length")).toBe(
        String(new TextEncoder().encode(body).length)
      );
      expect(head.headers.get("content-type")).toBe(
        "text/calendar; charset=utf-8"
      );
      expect(head.headers.get("cache-control")).toBe("private, no-store");
      expect(head.headers.get("cloudflare-cdn-cache-control")).toBe("no-store");
      expect(head.headers.get("referrer-policy")).toBe("no-referrer");
      expect(head.headers.get("etag")).toBeNull();
      await run(() => revokeSubscription({ expectedVersion: 1 }, owner));
      expect(
        (
          await request(subscriptionUrl, "GET", {
            "If-None-Match": "any-old-etag",
          })
        ).status
      ).toBe(401);
      expect((await request(subscriptionUrl, "HEAD")).status).toBe(401);
    });
    it("fails closed without a canonical HTTPS origin and never reads credentials while disabled", async () => {
      const { subscriptionUrl } = await rotate();
      const repository = await run(async () => getSubscriptionRepository());
      const spy = vi.spyOn(repository, "credential");
      for (const config of [
        "",
        "http://calendar.example.test",
        "https://u:p@example.test",
        "https://example.test/path",
        "https://example.test?secret=value",
        "https://example.test/#hash",
        "https://EXAMPLE.test",
      ]) {
        setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: config });
        expect((await request(subscriptionUrl)).status).toBe(503);
        await expect(rotate(1)).rejects.toMatchObject({ status: 503 });
        expect(await run(() => subscriptionStatus({}, owner))).toMatchObject({
          configured: false,
          enabled: true,
        });
      }
      expect(spy).not.toHaveBeenCalled();
    });
    it("refuses more than 1000 events and oversized snapshots instead of publishing truncated calendars", async () => {
      const { subscriptionUrl } = await rotate();
      await fixture.insertMany(
        Array.from({ length: CALENDAR_SUBSCRIPTION_MAX_EVENTS + 1 }, () =>
          subscriptionEvent()
        )
      );
      expect((await request(subscriptionUrl)).status).toBe(503);
    });
    it("refuses a corrupt event instead of silently dropping it", async () => {
      const { subscriptionUrl } = await rotate();
      await fixture.insertMany([
        subscriptionEvent(),
        subscriptionEvent(17, { startTimeUtc: -1, reminderTimeUtc: null }),
      ]);
      const response = await request(subscriptionUrl);
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("BEGIN:VCALENDAR");
    });
  });
}
