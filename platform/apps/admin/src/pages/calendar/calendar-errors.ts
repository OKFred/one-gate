import { classifyApiFailure } from '@/api/config';

export function calendarFailureKey(failure: unknown, unknownKey: string): string | null {
  const result = classifyApiFailure(failure);
  if (result.kind === 'session') return null;
  if (result.kind !== 'business') return unknownKey;
  switch (result.code) {
    case 'CALENDAR_INVALID_INPUT':
      return 'calendar.validation';
    case 'CALENDAR_NOT_FOUND':
      return 'calendar.notFound';
    case 'CALENDAR_STATE_CONFLICT':
      return 'calendar.stateConflict';
    case 'CALENDAR_REQUEST_CONFLICT':
      return 'calendar.requestConflict';
    default:
      return unknownKey;
  }
}
