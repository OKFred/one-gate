export const calendar = {
  'calendar.subscription.open': 'Subscribe',
  'calendar.subscription.title': 'Subscribe in Apple Calendar',
  'calendar.subscription.intro':
    'Manage events in One Gate; Apple Calendar receives a read-only subscription.',
  'calendar.subscription.enabled': 'Enabled',
  'calendar.subscription.disabled': 'Not enabled',
  'calendar.subscription.generate': 'Generate private address',
  'calendar.subscription.rotate': 'Regenerate address',
  'calendar.subscription.revoke': 'Disable subscription',
  'calendar.subscription.address': 'Private subscription address',
  'calendar.subscription.copy': 'Copy HTTPS address',
  'calendar.subscription.show': 'Show address',
  'calendar.subscription.hide': 'Hide address',
  'calendar.subscription.secretHelp':
    'Shown only this time. Anyone holding this link can read your events; keep it private.',
  'calendar.subscription.existingHelp':
    'An existing address cannot be shown again. To copy a new one, regenerate it and update your calendar client.',
  'calendar.subscription.rotateConfirm':
    'Anyone with the private link can read your active events. Subscribing lets Apple or iCloud download those events. Regenerating immediately invalidates the old address; update your calendar client afterwards.',
  'calendar.subscription.revokeConfirm':
    'The old address will stop working immediately. Already downloaded copies may remain until you unsubscribe in Apple Calendar.',
  'calendar.subscription.generated': 'Private address generated. Copy it before closing.',
  'calendar.subscription.revoked': 'Subscription disabled.',
  'calendar.subscription.copied': 'Subscription address copied.',
  'calendar.subscription.copyFailed':
    'Copy did not complete. Show the address to copy it manually.',
  'calendar.subscription.loadFailed': 'Could not load subscription status. Refresh to retry.',
  'calendar.subscription.writeUnknown':
    'The result could not be confirmed. Refresh status first. If an address was generated but not copied, regenerate it.',
  'calendar.subscription.conflict':
    'The subscription settings changed. Refresh status before trying again.',
  'calendar.subscription.unavailable':
    'Calendar subscriptions are not enabled on this service. Contact an administrator.',
  'calendar.subscription.appleHelp': 'Add to Apple Calendar',
  'calendar.subscription.iphone':
    'iPhone / iPad: Calendar → Calendars → Add Calendar → Add Subscription Calendar, then paste the HTTPS address.',
  'calendar.subscription.mac':
    'Mac: Calendar → File → New Calendar Subscription, then paste the HTTPS address. Choose iCloud to use it on your other devices.',
  'calendar.subscription.alerts':
    'Keep subscription alerts and allow system notifications if you want reminders. Updates refresh periodically, not instantly. Acknowledging an in-app reminder does not dismiss Apple alerts.',
  'errorHandler.personal.calendar.subscription.unavailable':
    'Calendar subscriptions are unavailable',
  'errorHandler.personal.calendar.subscription.stateConflict':
    'Subscription settings changed; refresh to retry',
  'errorHandler.personal.calendar.subscription.tooLarge':
    'The calendar exceeds the complete-feed capacity; no partial feed was returned',
  'errorHandler.personal.calendar.subscription.invalidData': 'The event dates cannot be exported',
  'calendar.title': 'Calendar',
  'calendar.private': 'Private events · Beijing time',
  'calendar.open': 'Calendar',
  'calendar.new': 'New event',
  'calendar.edit': 'Edit event',
  'calendar.today': 'Today',
  'calendar.previousMonth': 'Previous month',
  'calendar.nextMonth': 'Next month',
  'calendar.month': '{{year}}-{{month}}',
  'calendar.weekday.0': 'Mon',
  'calendar.weekday.1': 'Tue',
  'calendar.weekday.2': 'Wed',
  'calendar.weekday.3': 'Thu',
  'calendar.weekday.4': 'Fri',
  'calendar.weekday.5': 'Sat',
  'calendar.weekday.6': 'Sun',
  'calendar.eventCount': '{{count}} events',
  'calendar.agenda': 'Selected day',
  'calendar.upcoming': 'Upcoming events',
  'calendar.emptyDay': 'No events on this day',
  'calendar.emptyUpcoming': 'No upcoming events',
  'calendar.loading': 'Loading events',
  'calendar.loadFailed': 'Could not load events. Please retry.',
  'calendar.refresh': 'Refresh',
  'calendar.truncated':
    'Only the first 500 events are shown. Query the selected day to narrow the range.',
  'calendar.singleDay': 'Query selected day',
  'calendar.fullMonth': 'View full month',
  'calendar.field.title': 'Title',
  'calendar.field.start': 'Start time',
  'calendar.field.end': 'End time',
  'calendar.field.reminder': 'Reminder',
  'calendar.field.url': 'Link',
  'calendar.field.description': 'Description',
  'calendar.timeHelp': 'Times are saved and displayed in Beijing time (Asia/Shanghai).',
  'calendar.reminder.atTime': 'At event time',
  'calendar.reminder.before15': '15 minutes before',
  'calendar.reminder.beforeDay': '1 day before',
  'calendar.reminder.none': 'No reminder',
  'calendar.reminder.custom': 'Keep existing reminder time',
  'calendar.reminder.notice':
    'In-app only. Reminders due while the site is closed appear when you next open it.',
  'calendar.validation':
    'Check the title, times and link. End time must not precede start time. Links must use http or https.',
  'calendar.saved': 'Event saved',
  'calendar.cancelled': 'Event cancelled',
  'calendar.cancelEvent': 'Cancel event',
  'calendar.confirmCancellation': 'Confirm cancellation',
  'calendar.cancelQuestion': 'Cancel “{{title}}”? It will no longer appear or trigger reminders.',
  'calendar.openLink': 'Open link',
  'calendar.writeUnknown':
    'The result could not be confirmed. Refresh to check; saving again retries this same request.',
  'calendar.cancelUnknown': 'Cancellation could not be confirmed. Refresh to check.',
  'calendar.stateConflict': 'The event has changed. Refresh before trying again.',
  'calendar.requestConflict':
    'This request already contains different content. Close the form and refresh.',
  'calendar.notFound': 'This event is unavailable. Refresh to check.',
  'calendar.createCancelled': 'This event has been cancelled. Close the form and refresh to check.',
  'calendar.reminder.title': 'Event reminder',
  'calendar.reminder.more': 'More reminders are waiting',
  'calendar.reminder.view': 'View calendar',
  'calendar.reminder.ack': 'Got it',
  'calendar.reminder.ackUnknown':
    'The reminder could not be confirmed as handled. Retry or refresh to check.',
  'calendar.reminder.syncFailed': 'Could not update reminders. Please retry.',
  'errorHandler.personal.calendar.invalidInput': 'Check the event details and try again',
  'errorHandler.personal.calendar.notFound': 'The event is unavailable',
  'errorHandler.personal.calendar.stateConflict': 'The event has changed. Refresh and try again',
  'errorHandler.personal.calendar.requestConflict':
    'The same creation request contains different content. Refresh to check',
} as const;
