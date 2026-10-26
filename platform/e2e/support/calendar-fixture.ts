import type { Page } from '@playwright/test';
import type { paths } from '../../packages/ui/src/types/openapi';
import { fulfillOk, installCloudflareHomeFixture } from './cloudflare-home-fixture';

type CalendarEvent =
  paths['/api/v1/personal/calendar/get']['post']['responses'][200]['content']['application/json']['data'];
type CalendarAddInput = NonNullable<
  paths['/api/v1/personal/calendar/add']['post']['requestBody']
>['content']['application/json'];
type CalendarUpdateInput = NonNullable<
  paths['/api/v1/personal/calendar/update']['post']['requestBody']
>['content']['application/json'];

export const calendarNow = Date.UTC(2026, 9, 26, 2);
export const calendarStart = Date.UTC(2026, 10, 2, 1, 45);
const eventId = 'b57ba42e-f30a-47cb-98d2-8332dcfe4cb8';

export function calendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: eventId,
    title: 'Renew example.test domain',
    description: null,
    url: 'https://example.test/domains/renew',
    startTimeUtc: calendarStart,
    endTimeUtc: null,
    timeZone: 'Asia/Shanghai',
    reminderTimeUtc: calendarStart,
    reminderAcknowledgedTimeUtc: null,
    status: 'active',
    version: 1,
    createTimeUtc: calendarNow,
    updateTimeUtc: calendarNow,
    ...overrides,
  };
}

function editableFields(input: CalendarAddInput | CalendarUpdateInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    url: input.url ?? null,
    startTimeUtc: input.startTimeUtc,
    endTimeUtc: input.endTimeUtc ?? null,
    timeZone: input.timeZone,
    reminderTimeUtc: input.reminderTimeUtc ?? null,
  };
}

export async function installCalendarFixture(
  page: Page,
  options: { events?: CalendarEvent[]; langCode?: 'en-US' | 'zh-CN' } = {},
) {
  await page.clock.setFixedTime(new Date(calendarNow));
  await installCloudflareHomeFixture(page, { permissions: [], langCode: options.langCode });
  const state = {
    now: calendarNow,
    events: options.events ?? [],
    addRequests: [] as CalendarAddInput[],
    updateRequests: [] as CalendarUpdateInput[],
    cancelRequests: [] as { id: string; expectedVersion: number }[],
    ackRequests: [] as {
      id: string;
      expectedVersion: number;
      expectedReminderTimeUtc: number;
    }[],
    listRequests: [] as { fromTimeUtc: number; toTimeUtc: number }[],
    dueRequests: 0,
    loseNextAddResponse: false,
    loseNextAckResponse: false,
    failList: false,
    conflictUpdate: false,
  };
  await page.route('**/api/v1/personal/calendar/*', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    const reject = (code: string, status = 409) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'calendar.stateConflict', data: { code } }),
      });
    if (action === 'list') {
      const input = route.request().postDataJSON() as { fromTimeUtc: number; toTimeUtc: number };
      state.listRequests.push(input);
      if (state.failList) return route.fulfill({ status: 503, body: '{}' });
      const active = state.events
        .filter((event) => event.status === 'active')
        .sort((a, b) => a.startTimeUtc - b.startTimeUtc);
      return route.fulfill(
        fulfillOk({
          list: active.filter(
            (event) =>
              event.startTimeUtc < input.toTimeUtc &&
              (event.startTimeUtc >= input.fromTimeUtc ||
                (event.endTimeUtc !== null && event.endTimeUtc > input.fromTimeUtc)),
          ),
          hasMore: false,
          upcoming: active.filter((event) => event.startTimeUtc >= state.now).slice(0, 5),
        }),
      );
    }
    if (action === 'due') {
      state.dueRequests += 1;
      const outstanding = state.events.filter(
        (event) =>
          event.status === 'active' &&
          event.reminderTimeUtc !== null &&
          event.reminderAcknowledgedTimeUtc === null,
      );
      const due = outstanding.filter((event) => event.reminderTimeUtc! <= state.now);
      const next = outstanding
        .map((event) => event.reminderTimeUtc!)
        .filter((time) => time > state.now)
        .sort((a, b) => a - b)[0];
      return route.fulfill(
        fulfillOk({
          list: due.slice(0, 20),
          hasMore: due.length > 20,
          nextReminderTimeUtc: next ?? null,
          serverTimeUtc: state.now,
        }),
      );
    }
    if (action === 'add') {
      const input = route.request().postDataJSON() as CalendarAddInput;
      state.addRequests.push(input);
      if (!state.events.length) {
        state.events.push(calendarEvent(editableFields(input)));
      }
      if (state.loseNextAddResponse) {
        state.loseNextAddResponse = false;
        return route.abort('connectionfailed');
      }
      return route.fulfill(fulfillOk(state.events[0]));
    }
    if (action === 'update') {
      const input = route.request().postDataJSON() as CalendarUpdateInput;
      state.updateRequests.push(input);
      const index = state.events.findIndex((event) => event.id === input.id);
      const old = state.events[index];
      if (state.conflictUpdate || !old || old.version !== input.expectedVersion)
        return reject('CALENDAR_STATE_CONFLICT');
      const fields = editableFields(input);
      const changedTime =
        old.startTimeUtc !== fields.startTimeUtc || old.reminderTimeUtc !== fields.reminderTimeUtc;
      state.events[index] = {
        ...old,
        ...fields,
        version: old.version + 1,
        reminderAcknowledgedTimeUtc: changedTime ? null : old.reminderAcknowledgedTimeUtc,
        updateTimeUtc: state.now,
      };
      return route.fulfill(fulfillOk(state.events[index]));
    }
    if (action === 'cancel') {
      const input = route.request().postDataJSON() as { id: string; expectedVersion: number };
      state.cancelRequests.push(input);
      const event = state.events.find((item) => item.id === input.id);
      if (!event || event.version !== input.expectedVersion)
        return reject('CALENDAR_STATE_CONFLICT');
      event.status = 'cancelled';
      event.version += 1;
      return route.fulfill(fulfillOk({ id: event.id }));
    }
    if (action === 'ack') {
      const input = route.request().postDataJSON() as (typeof state.ackRequests)[number];
      state.ackRequests.push(input);
      const event = state.events.find((item) => item.id === input.id);
      if (
        !event ||
        event.status !== 'active' ||
        event.version !== input.expectedVersion ||
        event.reminderTimeUtc !== input.expectedReminderTimeUtc
      )
        return reject('CALENDAR_STATE_CONFLICT');
      event.reminderAcknowledgedTimeUtc ??= state.now;
      if (state.loseNextAckResponse) {
        state.loseNextAckResponse = false;
        return route.abort('connectionfailed');
      }
      return route.fulfill(
        fulfillOk({ id: event.id, acknowledgedTimeUtc: event.reminderAcknowledgedTimeUtc }),
      );
    }
    return route.fulfill({ status: 404, body: '{}' });
  });
  return state;
}
