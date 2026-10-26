import { expect, test } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment';
import {
  calendarEvent,
  calendarNow,
  calendarStart,
  installCalendarFixture,
} from '../support/calendar-fixture';

test.skip(!readE2EEnvironment().mockAuth, 'Calendar UI uses isolated synthetic fixtures.');

test('private calendar is accessible without an assignable permission or menu entry', async ({
  page,
}) => {
  const state = await installCalendarFixture(page);
  await page.goto('/#/home');
  await page.getByRole('link', { name: 'Calendar', exact: true }).click();
  await expect(page.getByTestId('calendar-page')).toBeVisible();
  await expect.poll(() => state.listRequests.length).toBeGreaterThan(0);
  await expect(page.getByTestId('calendar-reminder')).toHaveCount(0);
});

test('creates one event with Beijing time, event-time reminder and external link', async ({
  page,
}) => {
  const state = await installCalendarFixture(page);
  await page.goto('/#/calendar?date=2026-11-02');
  await page.getByTestId('calendar-new-event').click();
  await page.getByTestId('calendar-form-title').fill('Renew example.test domain');
  await page.getByTestId('calendar-form-start').fill('2026-11-02T09:45');
  await page.getByTestId('calendar-form-url').fill('https://example.test/domains/renew');
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.addRequests).toHaveLength(1);
  expect(state.addRequests[0]).toMatchObject({
    startTimeUtc: calendarStart,
    reminderTimeUtc: calendarStart,
    timeZone: 'Asia/Shanghai',
  });
  expect(state.addRequests[0]).not.toHaveProperty('ownerUserId');
  await expect(page.getByTestId(`calendar-event-${state.events[0].id}`)).toContainText('09:45');
  await expect(page.getByRole('link', { name: 'Open link' })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
});

test('lost create response keeps original request for manual idempotent retry', async ({
  page,
}) => {
  const state = await installCalendarFixture(page);
  state.loseNextAddResponse = true;
  await page.goto('/#/calendar?date=2026-11-02');
  await page.getByTestId('calendar-new-event').click();
  await page.getByTestId('calendar-form-title').fill('Synthetic renewal');
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByRole('dialog')).toContainText('The result could not be confirmed');
  await expect(page.getByTestId('calendar-form-title')).toBeDisabled();
  expect(state.addRequests).toHaveLength(1);
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.addRequests).toHaveLength(2);
  expect(state.addRequests[1]).toEqual(state.addRequests[0]);
  expect(state.events).toHaveLength(1);
});

test('saving stays successful if the follow-up list request fails', async ({ page }) => {
  const state = await installCalendarFixture(page);
  await page.goto('/#/calendar?date=2026-11-02');
  await page.getByTestId('calendar-new-event').click();
  await page.getByTestId('calendar-form-title').fill('Synthetic event');
  state.failList = true;
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByText('Event saved', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Could not load events. Please retry.', { exact: true }),
  ).toBeVisible();
  expect(state.addRequests).toHaveLength(1);
});

test('a create replay after cancellation cannot report saved or recreate the event', async ({
  page,
}) => {
  const state = await installCalendarFixture(page);
  state.loseNextAddResponse = true;
  await page.goto('/#/calendar?date=2026-11-02');
  await page.getByTestId('calendar-new-event').click();
  await page.getByTestId('calendar-form-title').fill('Cancelled elsewhere');
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByRole('dialog')).toContainText('The result could not be confirmed');
  state.events[0].status = 'cancelled';
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByRole('dialog')).toContainText('This event has been cancelled');
  await expect(page.getByTestId('calendar-form-save')).toBeDisabled();
  await expect(page.getByText('Event saved', { exact: true })).toHaveCount(0);
  expect(state.events).toHaveLength(1);
  expect(state.addRequests[1]).toEqual(state.addRequests[0]);
});

test('returning to a visible page checks reminders that became due while hidden', async ({
  page,
}) => {
  const state = await installCalendarFixture(page, { events: [calendarEvent()] });
  await page.goto('/#/home');
  await expect.poll(() => state.dueRequests).toBeGreaterThan(0);
  await expect(page.getByTestId('calendar-reminder')).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  state.now = calendarStart;
  const readsWhileHidden = state.dueRequests;
  await page.evaluate(() => {
    document.dispatchEvent(new Event('hodor:calendar-changed'));
  });
  expect(state.dueRequests).toBe(readsWhileHidden);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('calendar-reminder')).toContainText(state.events[0].title);
  expect(state.ackRequests).toHaveLength(0);
});

test('edits use the current version and cancellation requires explicit confirmation', async ({
  page,
}) => {
  const state = await installCalendarFixture(page, { events: [calendarEvent()] });
  const id = state.events[0].id;
  await page.goto('/#/calendar?date=2026-11-02');
  await page.getByTestId(`calendar-event-edit-${id}`).click();
  await page.getByTestId('calendar-form-title').fill('Changed synthetic event');
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByTestId(`calendar-event-${id}`)).toContainText('Changed synthetic event');
  expect(state.updateRequests[0].expectedVersion).toBe(1);
  await page.getByTestId(`calendar-event-cancel-${id}`).click();
  expect(state.cancelRequests).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await expect(page.getByTestId(`calendar-event-${id}`)).toHaveCount(0);
  expect(state.cancelRequests).toEqual([{ id, expectedVersion: 2 }]);
});

test('a stale edit conflict appears once and never reports success', async ({ page }) => {
  const state = await installCalendarFixture(page, { events: [calendarEvent()] });
  state.conflictUpdate = true;
  await page.goto('/#/calendar?date=2026-11-02');
  await page.getByTestId(`calendar-event-edit-${state.events[0].id}`).click();
  await page.getByTestId('calendar-form-title').fill('Stale edit');
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('The event has changed');
  await expect(page.getByText('Event saved', { exact: true })).toHaveCount(0);
  expect(state.updateRequests).toHaveLength(1);
});

test('month navigation and upcoming shortcut select the event date', async ({ page }) => {
  const state = await installCalendarFixture(page, { events: [calendarEvent()] });
  await page.goto('/#/calendar?date=2026-10-26');
  await page.getByTestId('calendar-next-month').click();
  await expect(page.getByTestId('calendar-month')).toHaveText('2026-11');
  await page.getByTestId('calendar-prev-month').click();
  await page.getByTestId(`calendar-upcoming-${state.events[0].id}`).click();
  await expect(page.getByTestId('calendar-selected-day')).toHaveText('2026-11-02');
  await expect(page.getByTestId(`calendar-event-${state.events[0].id}`)).toBeVisible();
});

test('overdue reminder persists across in-site navigation until explicitly acknowledged', async ({
  page,
}) => {
  const due = calendarEvent({
    startTimeUtc: calendarNow - 1000,
    reminderTimeUtc: calendarNow - 1000,
  });
  const state = await installCalendarFixture(page, { events: [due] });
  await page.goto('/#/home');
  await expect(page.getByTestId('calendar-reminder')).toContainText(due.title);
  await page.getByTestId('calendar-reminder').getByRole('link', { name: 'View calendar' }).click();
  await expect(page.getByTestId('calendar-page')).toBeVisible();
  await expect(page.getByTestId('calendar-reminder')).toContainText(due.title);
  await page.getByTestId('calendar-reminder-ack').click();
  await expect(page.getByTestId('calendar-reminder')).toHaveCount(0);
  expect(state.ackRequests).toEqual([
    { id: due.id, expectedVersion: 1, expectedReminderTimeUtc: due.reminderTimeUtc },
  ]);
});

test('lost acknowledgement response stays uncertain and retry does not acknowledge twice', async ({
  page,
}) => {
  const due = calendarEvent({ startTimeUtc: calendarNow, reminderTimeUtc: calendarNow });
  const state = await installCalendarFixture(page, { events: [due] });
  state.loseNextAckResponse = true;
  await page.goto('/#/home');
  await page.getByTestId('calendar-reminder-ack').click();
  await expect(page.getByTestId('calendar-reminder')).toContainText(
    'could not be confirmed as handled',
  );
  expect(state.ackRequests).toHaveLength(1);
  await page.getByTestId('calendar-reminder-ack').click();
  await expect(page.getByTestId('calendar-reminder')).toHaveCount(0);
  expect(state.ackRequests[1]).toEqual(state.ackRequests[0]);
});

test('old reminder cannot acknowledge an event that has been rescheduled', async ({ page }) => {
  const due = calendarEvent({ startTimeUtc: calendarNow, reminderTimeUtc: calendarNow });
  const state = await installCalendarFixture(page, { events: [due] });
  await page.goto('/#/home');
  await expect(page.getByTestId('calendar-reminder')).toBeVisible();
  state.events[0] = calendarEvent({ version: 2 });
  await page.getByTestId('calendar-reminder-ack').click();
  await expect(page.getByTestId('calendar-reminder')).not.toContainText(due.title);
  expect(state.events[0].reminderAcknowledgedTimeUtc).toBeNull();
  expect(state.ackRequests[0].expectedVersion).toBe(1);
});

test('logging out clears private events and reminder without acknowledging them', async ({
  page,
}) => {
  const due = calendarEvent({ startTimeUtc: calendarNow, reminderTimeUtc: calendarNow });
  const state = await installCalendarFixture(page, { events: [due] });
  await page.goto('/#/calendar?date=2026-10-26');
  await expect(page.getByTestId('calendar-reminder')).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem('userInfo');
    window.dispatchEvent(new Event('hodor:auth-changed'));
  });
  await expect(page.getByTestId('calendar-reminder')).toHaveCount(0);
  await expect(page.getByTestId('calendar-page')).toHaveCount(0);
  expect(state.ackRequests).toHaveLength(0);
});

test('a multi-day event appears on an overlapping middle day but not at its exclusive end', async ({
  page,
}) => {
  const event = calendarEvent({
    startTimeUtc: Date.UTC(2026, 9, 31, 15),
    endTimeUtc: Date.UTC(2026, 10, 2, 16),
    reminderTimeUtc: null,
  });
  await installCalendarFixture(page, { events: [event] });
  await page.goto('/#/calendar?date=2026-11-02');
  await expect(page.getByTestId(`calendar-event-${event.id}`)).toBeVisible();
  await page.getByTestId('calendar-day-2026-11-03').click();
  await expect(page.getByTestId(`calendar-event-${event.id}`)).toHaveCount(0);
});

test('editing only the title preserves seconds, milliseconds and acknowledged reminder', async ({
  page,
}) => {
  const event = calendarEvent({
    startTimeUtc: calendarStart + 12345,
    endTimeUtc: calendarStart + 600000 + 54321,
    reminderTimeUtc: calendarStart + 12345,
    reminderAcknowledgedTimeUtc: calendarNow,
  });
  const state = await installCalendarFixture(page, { events: [event] });
  await page.goto('/#/calendar?date=2026-11-02');
  await page.getByTestId(`calendar-event-edit-${event.id}`).click();
  await page.getByTestId('calendar-form-title').fill('Precision preserved');
  await page.getByTestId('calendar-form-save').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.updateRequests[0]).toMatchObject({
    startTimeUtc: event.startTimeUtc,
    endTimeUtc: event.endTimeUtc,
    reminderTimeUtc: event.reminderTimeUtc,
  });
  expect(state.events[0].reminderAcknowledgedTimeUtc).toBe(calendarNow);
});

test('Chinese dark calendar fits a 320px viewport and keyboard reaches the form', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await installCalendarFixture(page, { langCode: 'zh-CN', events: [calendarEvent()] });
  await page.goto('/#/calendar?date=2026-11-02');
  await expect(page.getByTestId('calendar-page')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.getByTestId('calendar-new-event').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('calendar-form-title')).toBeFocused();
  await expect(page.getByRole('dialog')).toContainText('站内');
});
