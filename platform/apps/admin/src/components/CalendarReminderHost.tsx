import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { ackFn, dueFn, type CalendarDue } from '@/api/personal/calendar';
import { subscribeCalendarChanges } from '@/api/personal/calendar-events';
import { classifyApiFailure } from '@/api/config';
import { useTranslation } from '@/hooks/useTranslation';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import { calendarDay, calendarTime } from '../pages/calendar/calendar-time';
import { calendarFailureKey } from '../pages/calendar/calendar-errors';

export default function CalendarReminderHost() {
  const t = useTranslation();
  const [data, setData] = useState<CalendarDue | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const refresh = useRef<() => void>(() => {});
  const ackLock = useRef(false);
  const ackController = useRef<AbortController | null>(null);

  useEffect(() => {
    const auth = captureAuthSession();
    if (!auth.token) return;
    let active = true;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    const currentSession = () => active && isCurrentAuthSession(auth);
    const clearTimer = () => {
      if (timer !== undefined) clearTimeout(timer);
    };
    const schedule = (delay = 60000) => {
      clearTimer();
      if (currentSession() && document.visibilityState === 'visible')
        timer = setTimeout(sync, Math.max(250, Math.min(60000, delay)));
    };
    const sync = () => {
      clearTimer();
      if (!currentSession() || document.visibilityState !== 'visible') return;
      controller?.abort();
      const abort = new AbortController();
      controller = abort;
      const requestGeneration = ++generation;
      const current = () =>
        currentSession() && generation === requestGeneration && !abort.signal.aborted;
      void dueFn({
        signal: abort.signal,
        ignoreAbort: true,
        errorPresentation: 'local',
        shouldPresentError: current,
      }).then(
        (response) => {
          if (!current()) return;
          const result = response.data.data;
          if (response.data.ok !== true || !result || !Array.isArray(result.list)) {
            setSyncFailed(true);
            schedule();
            return;
          }
          setSyncFailed(false);
          setData(result);
          const next = result.nextReminderTimeUtc;
          schedule(
            next === null || next <= result.serverTimeUtc ? 60000 : next - result.serverTimeUtc,
          );
        },
        (failure: unknown) => {
          if (!current()) return;
          if (classifyApiFailure(failure).kind !== 'session') setSyncFailed(true);
          schedule();
        },
      );
    };
    refresh.current = sync;
    const visibilityChanged = () => {
      if (document.visibilityState === 'visible') sync();
      else {
        generation += 1;
        controller?.abort();
        clearTimer();
      }
    };
    const unsubscribeChanges = subscribeCalendarChanges(sync);
    const unsubscribeAuth = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(auth)) return;
      active = false;
      generation += 1;
      clearTimer();
      controller?.abort();
      ackController.current?.abort();
      setData(null);
      setError(null);
      setSyncFailed(false);
      setPending(false);
    });
    document.addEventListener('visibilitychange', visibilityChanged);
    sync();
    return () => {
      active = false;
      generation += 1;
      clearTimer();
      controller?.abort();
      ackController.current?.abort();
      refresh.current = () => {};
      unsubscribeChanges();
      unsubscribeAuth();
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, []);

  const event = data?.list[0];
  const acknowledge = () => {
    if (!event || event.reminderTimeUtc === null || ackLock.current) return;
    ackLock.current = true;
    setPending(true);
    setError(null);
    const auth = captureAuthSession();
    const abort = new AbortController();
    ackController.current = abort;
    const current = () => isCurrentAuthSession(auth) && !abort.signal.aborted;
    void ackFn({
      data: {
        id: event.id,
        expectedVersion: event.version,
        expectedReminderTimeUtc: event.reminderTimeUtc,
      },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setError('calendar.reminder.ackUnknown');
            return;
          }
          setData((previous) =>
            previous
              ? {
                  ...previous,
                  list: previous.list.filter(
                    (item) =>
                      item.id !== event.id ||
                      item.version !== event.version ||
                      item.reminderTimeUtc !== event.reminderTimeUtc,
                  ),
                }
              : previous,
          );
          refresh.current();
        },
        (failure: unknown) => {
          if (!current()) return;
          setError(calendarFailureKey(failure, 'calendar.reminder.ackUnknown'));
          const result = classifyApiFailure(failure);
          if (
            result.kind === 'business' &&
            (result.code === 'CALENDAR_STATE_CONFLICT' || result.code === 'CALENDAR_NOT_FOUND')
          )
            refresh.current();
        },
      )
      .finally(() => {
        ackLock.current = false;
        if (current()) setPending(false);
      });
  };

  if (!event && !error && !syncFailed) return null;
  return (
    <Paper
      variant="outlined"
      role="status"
      aria-live="polite"
      data-testid="calendar-reminder"
      sx={{
        position: 'fixed',
        right: { xs: 8, sm: 20 },
        bottom: { xs: 8, sm: 20 },
        p: 2,
        width: { xs: 'calc(100vw - 16px)', sm: 360 },
        maxWidth: 360,
        zIndex: (theme) => theme.zIndex.snackbar,
        bgcolor: 'background.paper',
        boxShadow: 3,
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        {event && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('calendar.reminder.title')}
            </Typography>
            <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
              {event.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {calendarTime(event.startTimeUtc)}
            </Typography>
          </Box>
        )}
        {(data?.list.length ?? 0) > 1 || data?.hasMore ? (
          <Typography variant="caption" color="text.secondary">
            {t('calendar.reminder.more')}
          </Typography>
        ) : null}
        {error && (
          <Alert severity="warning" onClose={() => setError(null)} sx={{ py: 0 }}>
            {t(error)}
          </Alert>
        )}
        {syncFailed && !error && (
          <Alert severity="warning" sx={{ py: 0 }}>
            {t('calendar.reminder.syncFailed')}
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button
            size="small"
            component={RouterLink}
            to={event ? `/calendar?date=${calendarDay(event.startTimeUtc)}` : '/calendar'}
          >
            {t('calendar.reminder.view')}
          </Button>
          {event && (
            <Button
              size="small"
              variant="contained"
              disabled={pending}
              onClick={acknowledge}
              data-testid="calendar-reminder-ack"
            >
              {t('calendar.reminder.ack')}
            </Button>
          )}
          {syncFailed && (
            <Button size="small" onClick={() => refresh.current()}>
              {t('calendar.refresh')}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
