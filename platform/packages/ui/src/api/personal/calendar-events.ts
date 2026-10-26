const CALENDAR_CHANGED_EVENT = 'hodor:calendar-changed';

export function notifyCalendarChanged(): void {
  window.dispatchEvent(new Event(CALENDAR_CHANGED_EVENT));
}

export function subscribeCalendarChanges(listener: () => void): () => void {
  window.addEventListener(CALENDAR_CHANGED_EVENT, listener);
  return () => window.removeEventListener(CALENDAR_CHANGED_EVENT, listener);
}
