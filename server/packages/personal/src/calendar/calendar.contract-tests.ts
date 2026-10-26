import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserObj } from "@hodor/core/types/app";
import { BusinessErrorCode } from "@hodor/core/middleware/errorHandler/businessError";
import {
  CALENDAR_MAX_RANGE_MS,
  type CalendarAddRequest,
  type CalendarEvent,
  type CalendarEventInsert,
  type CalendarUpdateRequest,
} from "./model";
import { getCalendarRepository } from "./repository";
import { CalendarError } from "./errors";
import {
  acknowledgeCalendarReminder,
  addCalendarEvent,
  cancelCalendarEvent,
  dueCalendarEvents,
  getCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "./service";

export function calendarActor(userId: number, superAdmin = false): UserObj {
  return {
    principal: { kind: "user", userId },
    id: 999,
    userId: 998,
    username: "synthetic-calendar-user",
    langCode: "en-US",
    isEnabled: true,
    token: "synthetic-test-only",
    isSuperAdmin: superAdmin,
    roleIds: [],
    permissions: [],
    dataScope: "all",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
  };
}

const initialNow = Date.UTC(2026, 0, 2, 1, 15);
export function syntheticCalendarInput(
  overrides: Partial<CalendarAddRequest> = {}
): CalendarAddRequest {
  return {
    requestKey: crypto.randomUUID(),
    title: "Synthetic renewal",
    description: null,
    url: "https://example.test/calendar",
    startTimeUtc: initialNow + 60_000,
    endTimeUtc: null,
    timeZone: "Asia/Shanghai",
    reminderTimeUtc: initialNow,
    ...overrides,
  };
}
function editing(
  event: CalendarEvent,
  changes: Partial<CalendarUpdateRequest> = {}
): CalendarUpdateRequest {
  return {
    id: event.id,
    expectedVersion: event.version,
    title: event.title,
    description: event.description,
    url: event.url,
    startTimeUtc: event.startTimeUtc,
    endTimeUtc: event.endTimeUtc,
    timeZone: event.timeZone,
    reminderTimeUtc: event.reminderTimeUtc,
    ...changes,
  };
}
const businessFailure = (code: string, status: number) => ({
  status,
  cause: { error: { code } },
});

export interface CalendarContractFixture {
  reset(): Promise<void>;
  run<T>(operation: () => Promise<T>): Promise<T>;
  insertMany(rows: CalendarEventInsert[]): Promise<void>;
}

/** The same business assertions run against SQLite, D1 and a loopback PostgreSQL fixture. */
export function calendarContractTests(fixture: CalendarContractFixture): void {
  describe("private calendar contract", () => {
    let now = initialNow;
    const owner = calendarActor(17);
    const outsider = calendarActor(18, true);
    const run = <T>(operation: () => Promise<T>) => fixture.run(operation);
    beforeEach(async () => {
      await fixture.reset();
      now = initialNow;
      vi.spyOn(Date, "now").mockImplementation(() => now);
    });
    afterEach(() => vi.restoreAllMocks());

    it("uses only the human principal and never grants superadmin cross-user visibility", async () => {
      const event = await run(() =>
        addCalendarEvent(syntheticCalendarInput(), owner)
      );
      expect(event).not.toHaveProperty("ownerUserId");
      expect(event).not.toHaveProperty("requestKey");
      expect(
        await run(() => getCalendarRepository().find(17, event.id))
      ).not.toBeNull();
      expect(
        await run(() => getCalendarRepository().find(999, event.id))
      ).toBeNull();
      for (const operation of [
        () => getCalendarEvent({ id: event.id }, outsider),
        () => updateCalendarEvent(editing(event), outsider),
        () =>
          cancelCalendarEvent({ id: event.id, expectedVersion: 1 }, outsider),
        () =>
          acknowledgeCalendarReminder(
            {
              id: event.id,
              expectedVersion: 1,
              expectedReminderTimeUtc: initialNow,
            },
            outsider
          ),
      ])
        await expect(run(operation)).rejects.toMatchObject(
          businessFailure(CalendarError.NOT_FOUND, 404)
        );
      expect((await run(() => dueCalendarEvents({}, outsider))).list).toEqual(
        []
      );
      expect(
        (
          await run(() =>
            listCalendarEvents(
              { fromTimeUtc: initialNow, toTimeUtc: initialNow + 86_400_000 },
              outsider
            )
          )
        ).list
      ).toEqual([]);
      const machine: UserObj = {
        ...owner,
        principal: { kind: "api_token", tokenId: 17 },
      };
      await expect(
        run(() => dueCalendarEvents({}, machine))
      ).rejects.toMatchObject({ code: BusinessErrorCode.PERMISSION_DENIED });
      await expect(
        run(() => dueCalendarEvents({}, undefined))
      ).rejects.toMatchObject({ code: BusinessErrorCode.NOT_AUTHENTICATED });
    });

    it("creates once for concurrent request keys and refuses conflicting payloads without overwriting", async () => {
      const input = syntheticCalendarInput();
      const [first, replay] = await Promise.all([
        run(() => addCalendarEvent(input, owner)),
        run(() => addCalendarEvent(input, owner)),
      ]);
      expect(first.id).toBe(replay.id);
      await expect(
        run(() =>
          addCalendarEvent({ ...input, title: "A different request" }, owner)
        )
      ).rejects.toMatchObject(
        businessFailure(CalendarError.REQUEST_CONFLICT, 409)
      );
      expect(
        (await run(() => getCalendarEvent({ id: first.id }, owner))).title
      ).toBe(input.title);
      expect((await run(() => addCalendarEvent(input, outsider))).id).not.toBe(
        first.id
      );
    });

    it.each([
      { title: "  " },
      { url: "javascript:alert(1)" },
      { url: "not a URL" },
      { timeZone: "Synthetic/Invalid" },
      { startTimeUtc: Number.NaN },
      { startTimeUtc: 1.5 },
      { endTimeUtc: initialNow - 1 },
      { reminderTimeUtc: initialNow + 120_000 },
    ])("rejects invalid editable values %j", async (changes) => {
      await expect(
        run(() => addCalendarEvent(syntheticCalendarInput(changes), owner))
      ).rejects.toMatchObject(
        businessFailure(CalendarError.INVALID_INPUT, 400)
      );
    });

    it("uses half-open calendar windows, includes spanning events and caps upcoming at five", async () => {
      const from = initialNow;
      const to = from + 86_400_000;
      const point = await run(() =>
        addCalendarEvent(
          syntheticCalendarInput({ startTimeUtc: from, reminderTimeUtc: null }),
          owner
        )
      );
      const spanning = await run(() =>
        addCalendarEvent(
          syntheticCalendarInput({
            startTimeUtc: from - 1,
            endTimeUtc: from + 1,
            reminderTimeUtc: null,
          }),
          owner
        )
      );
      await run(() =>
        addCalendarEvent(
          syntheticCalendarInput({
            startTimeUtc: from - 100,
            endTimeUtc: from,
            reminderTimeUtc: null,
          }),
          owner
        )
      );
      await run(() =>
        addCalendarEvent(
          syntheticCalendarInput({ startTimeUtc: to, reminderTimeUtc: null }),
          owner
        )
      );
      for (let index = 0; index < 7; index++)
        await run(() =>
          addCalendarEvent(
            syntheticCalendarInput({
              startTimeUtc: to + index + 1,
              reminderTimeUtc: null,
            }),
            owner
          )
        );
      const result = await run(() =>
        listCalendarEvents({ fromTimeUtc: from, toTimeUtc: to }, owner)
      );
      expect(result.list.map((event) => event.id)).toEqual([
        spanning.id,
        point.id,
      ]);
      expect(result.hasMore).toBe(false);
      expect(result.upcoming).toHaveLength(5);
      await expect(
        run(() =>
          listCalendarEvents(
            { fromTimeUtc: from, toTimeUtc: from + CALENDAR_MAX_RANGE_MS },
            owner
          )
        )
      ).resolves.toBeDefined();
      for (const end of [from, from - 1, from + CALENDAR_MAX_RANGE_MS + 1])
        await expect(
          run(() =>
            listCalendarEvents({ fromTimeUtc: from, toTimeUtc: end }, owner)
          )
        ).rejects.toMatchObject(
          businessFailure(CalendarError.INVALID_INPUT, 400)
        );
    });

    it("returns due reminders exactly at the boundary and leaves them pending until explicit acknowledgement", async () => {
      const event = await run(() =>
        addCalendarEvent(
          syntheticCalendarInput({ reminderTimeUtc: now + 1 }),
          owner
        )
      );
      const ack = {
        id: event.id,
        expectedVersion: 1,
        expectedReminderTimeUtc: now + 1,
      };
      expect(await run(() => dueCalendarEvents({}, owner))).toMatchObject({
        list: [],
        nextReminderTimeUtc: now + 1,
        serverTimeUtc: now,
      });
      await expect(
        run(() => acknowledgeCalendarReminder(ack, owner))
      ).rejects.toMatchObject(
        businessFailure(CalendarError.STATE_CONFLICT, 409)
      );
      now += 1;
      for (let attempt = 0; attempt < 2; attempt++)
        expect(
          (await run(() => dueCalendarEvents({}, owner))).list.map(
            (value) => value.id
          )
        ).toEqual([event.id]);
      const acknowledged = await run(() =>
        acknowledgeCalendarReminder(ack, owner)
      );
      now += 60_000;
      expect(await run(() => acknowledgeCalendarReminder(ack, owner))).toEqual(
        acknowledged
      );
      expect(
        (await run(() => getCalendarEvent({ id: event.id }, owner))).version
      ).toBe(1);
      expect((await run(() => dueCalendarEvents({}, owner))).list).toEqual([]);
    });

    it("preserves an acknowledgement on description edits and resets it only when reminder/start changes", async () => {
      const event = await run(() =>
        addCalendarEvent(syntheticCalendarInput(), owner)
      );
      const acknowledgement = await run(() =>
        acknowledgeCalendarReminder(
          {
            id: event.id,
            expectedVersion: 1,
            expectedReminderTimeUtc: initialNow,
          },
          owner
        )
      );
      const edited = await run(() =>
        updateCalendarEvent(
          editing(event, { description: "Updated description" }),
          owner
        )
      );
      expect(edited.reminderAcknowledgedTimeUtc).toBe(
        acknowledgement.acknowledgedTimeUtc
      );
      const rescheduled = await run(() =>
        updateCalendarEvent(
          editing(edited, { startTimeUtc: event.startTimeUtc + 1 }),
          owner
        )
      );
      expect(rescheduled.reminderAcknowledgedTimeUtc).toBeNull();
      await expect(
        run(() =>
          acknowledgeCalendarReminder(
            {
              id: event.id,
              expectedVersion: 1,
              expectedReminderTimeUtc: initialNow,
            },
            owner
          )
        )
      ).rejects.toMatchObject(
        businessFailure(CalendarError.STATE_CONFLICT, 409)
      );
      await expect(
        run(() => updateCalendarEvent(editing(event), owner))
      ).rejects.toMatchObject(
        businessFailure(CalendarError.STATE_CONFLICT, 409)
      );
    });

    it("keeps acknowledged reminders when an acknowledgement wins a concurrent non-schedule edit", async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const event = await run(() =>
          addCalendarEvent(syntheticCalendarInput(), owner)
        );
        const [ack, update] = await Promise.allSettled([
          run(() =>
            acknowledgeCalendarReminder(
              {
                id: event.id,
                expectedVersion: 1,
                expectedReminderTimeUtc: initialNow,
              },
              owner
            )
          ),
          run(() =>
            updateCalendarEvent(
              editing(event, { title: "Concurrent edit" }),
              owner
            )
          ),
        ]);
        expect(update.status).toBe("fulfilled");
        const stored = await run(() =>
          getCalendarEvent({ id: event.id }, owner)
        );
        if (ack.status === "fulfilled")
          expect(stored.reminderAcknowledgedTimeUtc).toBe(
            ack.value.acknowledgedTimeUtc
          );
        else expect(stored.reminderAcknowledgedTimeUtc).toBeNull();
        expect(stored.version).toBe(2);
      }
    });

    it("cancels with CAS, retains the event and prevents stale acknowledgements", async () => {
      const input = syntheticCalendarInput();
      const event = await run(() => addCalendarEvent(input, owner));
      expect(
        await run(() =>
          cancelCalendarEvent({ id: event.id, expectedVersion: 1 }, owner)
        )
      ).toEqual({ id: event.id });
      expect(
        await run(() => getCalendarEvent({ id: event.id }, owner))
      ).toMatchObject({ status: "cancelled", version: 2 });
      expect((await run(() => addCalendarEvent(input, owner))).status).toBe(
        "cancelled"
      );
      expect((await run(() => dueCalendarEvents({}, owner))).list).toEqual([]);
      expect(
        (
          await run(() =>
            listCalendarEvents(
              { fromTimeUtc: initialNow, toTimeUtc: initialNow + 86_400_000 },
              owner
            )
          )
        ).list
      ).toEqual([]);
      await expect(
        run(() =>
          acknowledgeCalendarReminder(
            {
              id: event.id,
              expectedVersion: 1,
              expectedReminderTimeUtc: initialNow,
            },
            owner
          )
        )
      ).rejects.toMatchObject(
        businessFailure(CalendarError.STATE_CONFLICT, 409)
      );
      await expect(
        run(() =>
          cancelCalendarEvent({ id: event.id, expectedVersion: 1 }, owner)
        )
      ).rejects.toMatchObject(
        businessFailure(CalendarError.STATE_CONFLICT, 409)
      );
    });

    it("never carries an old acknowledgement into a concurrent reschedule or cancellation", async () => {
      for (const action of ["reschedule", "cancel"] as const) {
        const event = await run(() =>
          addCalendarEvent(syntheticCalendarInput(), owner)
        );
        const [acknowledged, changed] = await Promise.allSettled([
          run(() =>
            acknowledgeCalendarReminder(
              {
                id: event.id,
                expectedVersion: 1,
                expectedReminderTimeUtc: initialNow,
              },
              owner
            )
          ),
          action === "reschedule"
            ? run(() =>
                updateCalendarEvent(
                  editing(event, {
                    startTimeUtc: initialNow + 120_000,
                    reminderTimeUtc: initialNow + 60_000,
                  }),
                  owner
                )
              )
            : run(() =>
                cancelCalendarEvent({ id: event.id, expectedVersion: 1 }, owner)
              ),
        ]);
        expect(changed.status).toBe("fulfilled");
        if (acknowledged.status === "rejected")
          expect(acknowledged.reason).toMatchObject(
            businessFailure(CalendarError.STATE_CONFLICT, 409)
          );
        const stored = await run(() =>
          getCalendarEvent({ id: event.id }, owner)
        );
        expect(stored.version).toBe(2);
        if (action === "reschedule") {
          expect(stored.reminderAcknowledgedTimeUtc).toBeNull();
          expect(stored.reminderTimeUtc).toBe(initialNow + 60_000);
        } else expect(stored.status).toBe("cancelled");
        expect(
          (await run(() => dueCalendarEvents({}, owner))).list.some(
            (item) => item.id === event.id
          )
        ).toBe(false);
      }
    });

    it("reports truncation without silently discarding pending reminders", async () => {
      const rows: CalendarEventInsert[] = Array.from(
        { length: 501 },
        (_, index) => ({
          id: crypto.randomUUID(),
          ownerUserId: 17,
          requestKey: crypto.randomUUID(),
          title: `Synthetic item ${index}`,
          description: null,
          url: null,
          startTimeUtc: initialNow + 1000 + index,
          endTimeUtc: null,
          timeZone: "Asia/Shanghai",
          reminderTimeUtc: initialNow,
          reminderAcknowledgedTimeUtc: null,
          status: "active",
          version: 1,
          createTimeUtc: initialNow,
          updateTimeUtc: initialNow,
        })
      );
      await fixture.insertMany(rows);
      const listed = await run(() =>
        listCalendarEvents(
          { fromTimeUtc: initialNow, toTimeUtc: initialNow + 86_400_000 },
          owner
        )
      );
      expect(listed.list).toHaveLength(500);
      expect(listed.hasMore).toBe(true);
      const due = await run(() => dueCalendarEvents({}, owner));
      expect(due.list).toHaveLength(20);
      expect(due.hasMore).toBe(true);
      expect(due.nextReminderTimeUtc).toBeNull();
      for (const event of due.list)
        await run(() =>
          acknowledgeCalendarReminder(
            {
              id: event.id,
              expectedVersion: 1,
              expectedReminderTimeUtc: initialNow,
            },
            owner
          )
        );
      const remaining = await run(() => dueCalendarEvents({}, owner));
      expect(remaining.list).toHaveLength(20);
      expect(
        remaining.list.every(
          (event) => !due.list.some((prior) => prior.id === event.id)
        )
      ).toBe(true);
    });
  });
}
