import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { CalendarEvent } from '@/api/personal/calendar';

dayjs.extend(utc);
dayjs.extend(timezone);

export const CALENDAR_TIME_ZONE = 'Asia/Shanghai';

export function calendarDay(timestamp = Date.now()): string {
  return dayjs(timestamp).tz(CALENDAR_TIME_ZONE).format('YYYY-MM-DD');
}

export function calendarTime(timestamp: number, format = 'YYYY-MM-DD HH:mm'): string {
  return dayjs(timestamp).tz(CALENDAR_TIME_ZONE).format(format);
}

export function calendarTimestamp(value: string): number {
  try {
    return dayjs.tz(value, CALENDAR_TIME_ZONE).valueOf();
  } catch {
    return Number.NaN;
  }
}

export function calendarInput(timestamp: number): string {
  return calendarTime(timestamp, 'YYYY-MM-DDTHH:mm');
}

export function validCalendarDay(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = calendarTimestamp(value);
  return Number.isFinite(timestamp) && calendarDay(timestamp) === value ? value : null;
}

export function calendarMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function moveCalendarMonth(month: string, count: number): string {
  return dayjs.tz(month, CALENDAR_TIME_ZONE).add(count, 'month').format('YYYY-MM-DD');
}

export function calendarGrid(month: string): string[] {
  const start = dayjs.tz(month, CALENDAR_TIME_ZONE);
  const offset = (start.day() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    start.add(index - offset, 'day').format('YYYY-MM-DD'),
  );
}

export function calendarRange(month: string, singleDay: string | null) {
  const start = dayjs.tz(singleDay ?? month, CALENDAR_TIME_ZONE);
  return {
    fromTimeUtc: start.valueOf(),
    toTimeUtc: start.add(1, singleDay ? 'day' : 'month').valueOf(),
  };
}

export function calendarEventInRange(
  event: Pick<CalendarEvent, 'startTimeUtc' | 'endTimeUtc'>,
  range: ReturnType<typeof calendarRange>,
): boolean {
  return (
    event.startTimeUtc < range.toTimeUtc &&
    (event.startTimeUtc >= range.fromTimeUtc ||
      (event.endTimeUtc !== null && event.endTimeUtc > range.fromTimeUtc))
  );
}
