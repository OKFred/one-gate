import { HTTPException } from "hono/http-exception";

export const CalendarError = {
  INVALID_INPUT: "CALENDAR_INVALID_INPUT",
  NOT_FOUND: "CALENDAR_NOT_FOUND",
  STATE_CONFLICT: "CALENDAR_STATE_CONFLICT",
  REQUEST_CONFLICT: "CALENDAR_REQUEST_CONFLICT",
} as const;
type CalendarErrorCode = (typeof CalendarError)[keyof typeof CalendarError];

const presentations = {
  CALENDAR_INVALID_INPUT: [400, "errorHandler.personal.calendar.invalidInput"],
  CALENDAR_NOT_FOUND: [404, "errorHandler.personal.calendar.notFound"],
  CALENDAR_STATE_CONFLICT: [
    409,
    "errorHandler.personal.calendar.stateConflict",
  ],
  CALENDAR_REQUEST_CONFLICT: [
    409,
    "errorHandler.personal.calendar.requestConflict",
  ],
} as const;

export function calendarError(code: CalendarErrorCode): HTTPException {
  const [status, message] = presentations[code];
  return new HTTPException(status, { message, cause: { error: { code } } });
}
