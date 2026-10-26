import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Add, ChevronLeft, ChevronRight, Refresh } from '@mui/icons-material';
import { cancelFn, listFn, type CalendarEvent, type CalendarList } from '@/api/personal/calendar';
import { notifyCalendarChanged, subscribeCalendarChanges } from '@/api/personal/calendar-events';
import { useTranslation } from '@/hooks/useTranslation';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import EventForm from './EventForm';
import { calendarFailureKey } from './calendar-errors';
import {
  calendarDay,
  calendarEventInRange,
  calendarGrid,
  calendarMonth,
  calendarRange,
  calendarTime,
  moveCalendarMonth,
  validCalendarDay,
} from './calendar-time';

export default function CalendarPage() {
  const t = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDay = validCalendarDay(searchParams.get('date')) ?? calendarDay();
  const month = calendarMonth(selectedDay);
  const [singleDay, setSingleDay] = useState(false);
  const [data, setData] = useState<CalendarList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<{ key: string; event: CalendarEvent | null } | null>(null);
  const [cancelling, setCancelling] = useState<CalendarEvent | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const generation = useRef(0);
  const cancelLock = useRef(false);
  const cancelController = useRef<AbortController | null>(null);
  const requestedDay = singleDay ? selectedDay : null;
  const closeForm = useCallback(() => setForm(null), []);

  useEffect(() => subscribeCalendarChanges(() => setRevision((value) => value + 1)), []);

  useEffect(() => {
    const requestGeneration = ++generation.current;
    const auth = captureAuthSession();
    const abort = new AbortController();
    const current = () => generation.current === requestGeneration && isCurrentAuthSession(auth);
    setLoading(true);
    setError(null);
    void listFn({
      data: calendarRange(month, requestedDay),
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setError('calendar.loadFailed');
            return;
          }
          setData(response.data.data);
        },
        (failure: unknown) => {
          if (current()) setError(calendarFailureKey(failure, 'calendar.loadFailed'));
        },
      )
      .finally(() => {
        if (current()) setLoading(false);
      });
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(auth)) return;
      generation.current += 1;
      abort.abort();
      cancelController.current?.abort();
      setData(null);
      setForm(null);
      setCancelling(null);
      setError(null);
      setNotice(null);
    });
    return () => {
      generation.current += 1;
      abort.abort();
      unsubscribe();
    };
  }, [month, requestedDay, revision]);

  useEffect(() => () => cancelController.current?.abort(), []);

  const selectDay = (day: string) => {
    setSearchParams({ date: day });
  };

  const cancelEvent = () => {
    if (!cancelling || cancelLock.current) return;
    cancelLock.current = true;
    setCancelPending(true);
    setCancelError(null);
    const event = cancelling;
    const auth = captureAuthSession();
    const abort = new AbortController();
    cancelController.current = abort;
    const current = () => isCurrentAuthSession(auth) && !abort.signal.aborted;
    void cancelFn({
      data: { id: event.id, expectedVersion: event.version },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setCancelError('calendar.cancelUnknown');
            return;
          }
          setCancelling(null);
          setNotice('calendar.cancelled');
          notifyCalendarChanged();
        },
        (failure: unknown) => {
          if (current()) setCancelError(calendarFailureKey(failure, 'calendar.cancelUnknown'));
        },
      )
      .finally(() => {
        cancelLock.current = false;
        if (current()) setCancelPending(false);
      });
  };

  const events = data?.list ?? [];
  const selectedRange = calendarRange(month, selectedDay);
  const selectedEvents = events.filter((event) => calendarEventInRange(event, selectedRange));
  const days = calendarGrid(month);
  const counts = new Map(
    days.map((day) => {
      const range = calendarRange(month, day);
      return [day, events.filter((event) => calendarEventInRange(event, range)).length];
    }),
  );

  return (
    <Stack spacing={2} sx={{ maxWidth: 1100, mx: 'auto', minWidth: 0 }} data-testid="calendar-page">
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 600 }}>
            {t('calendar.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('calendar.private')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          data-testid="calendar-new-event"
          onClick={() => setForm({ key: crypto.randomUUID(), event: null })}
        >
          {t('calendar.new')}
        </Button>
      </Stack>
      {notice && (
        <Alert severity="success" onClose={() => setNotice(null)}>
          {t(notice)}
        </Alert>
      )}
      {error && (
        <Alert
          severity="error"
          action={
            <Button
              size="small"
              color="inherit"
              disabled={loading}
              onClick={() => setRevision((v) => v + 1)}
            >
              {t('calendar.refresh')}
            </Button>
          }
        >
          {t(error)}
        </Alert>
      )}
      {loading && <LinearProgress aria-label={t('calendar.loading')} />}
      {data?.hasMore && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => setSingleDay(true)}>
              {t('calendar.singleDay')}
            </Button>
          }
        >
          {t('calendar.truncated')}
        </Alert>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.4fr) minmax(0, 1fr)' },
          gap: 2,
        }}
      >
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, alignSelf: 'start', minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 1 }}>
            <IconButton
              aria-label={t('calendar.previousMonth')}
              data-testid="calendar-prev-month"
              onClick={() => selectDay(moveCalendarMonth(month, -1))}
            >
              <ChevronLeft />
            </IconButton>
            <Typography
              variant="subtitle1"
              sx={{ flex: 1, textAlign: 'center', fontWeight: 600 }}
              data-testid="calendar-month"
            >
              {t('calendar.month', { year: month.slice(0, 4), month: month.slice(5, 7) })}
            </Typography>
            <IconButton
              aria-label={t('calendar.nextMonth')}
              data-testid="calendar-next-month"
              onClick={() => selectDay(moveCalendarMonth(month, 1))}
            >
              <ChevronRight />
            </IconButton>
            <Button size="small" onClick={() => selectDay(calendarDay())}>
              {t('calendar.today')}
            </Button>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
            {Array.from({ length: 7 }, (_, index) => (
              <Typography
                key={index}
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 0.5 }}
              >
                {t(`calendar.weekday.${index}`)}
              </Typography>
            ))}
            {days.map((day) => {
              const count = counts.get(day) ?? 0;
              const selected = day === selectedDay;
              return (
                <ButtonBase
                  key={day}
                  data-testid={`calendar-day-${day}`}
                  aria-pressed={selected}
                  aria-label={`${day} ${t('calendar.eventCount', { count })}`}
                  onClick={() => selectDay(day)}
                  sx={{
                    border: 1,
                    borderColor: selected ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    flexDirection: 'column',
                    minHeight: { xs: 43, sm: 62 },
                    minWidth: 0,
                    bgcolor: selected ? 'action.selected' : 'transparent',
                    color: day.slice(0, 7) === month.slice(0, 7) ? 'text.primary' : 'text.disabled',
                    '&:hover': { bgcolor: 'action.hover' },
                    '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: day === calendarDay() ? 700 : 400 }}
                  >
                    {Number(day.slice(-2))}
                  </Typography>
                  <Box
                    sx={{
                      height: 6,
                      width: 6,
                      borderRadius: '50%',
                      bgcolor: count ? 'primary.main' : 'transparent',
                      mt: 0.5,
                    }}
                  />
                </ButtonBase>
              );
            })}
          </Box>
          {singleDay && (
            <Button size="small" onClick={() => setSingleDay(false)} sx={{ mt: 1 }}>
              {t('calendar.fullMonth')}
            </Button>
          )}
        </Paper>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t('calendar.agenda')}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  data-testid="calendar-selected-day"
                >
                  {selectedDay}
                </Typography>
              </Box>
              <IconButton
                aria-label={t('calendar.refresh')}
                onClick={() => setRevision((v) => v + 1)}
                disabled={loading}
              >
                <Refresh />
              </IconButton>
            </Stack>
            <Stack spacing={1.5}>
              {!loading && selectedEvents.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('calendar.emptyDay')}
                </Typography>
              )}
              {selectedEvents.map((event) => (
                <Box
                  key={event.id}
                  data-testid={`calendar-event-${event.id}`}
                  sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5, minWidth: 0 }}
                >
                  <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                    {event.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {calendarTime(
                      event.startTimeUtc,
                      calendarDay(event.startTimeUtc) === selectedDay ? 'HH:mm' : 'MM-DD HH:mm',
                    )}
                    {event.endTimeUtc !== null ? ` – ${calendarTime(event.endTimeUtc)}` : ''}
                  </Typography>
                  {event.description && (
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mt: 0.5 }}
                    >
                      {event.description}
                    </Typography>
                  )}
                  {event.url && (
                    <Link
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'inline-block', mt: 0.5 }}
                    >
                      {t('calendar.openLink')}
                    </Link>
                  )}
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
                    <Button
                      size="small"
                      data-testid={`calendar-event-edit-${event.id}`}
                      onClick={() => setForm({ key: crypto.randomUUID(), event })}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      data-testid={`calendar-event-cancel-${event.id}`}
                      onClick={() => {
                        setCancelError(null);
                        setCancelling(event);
                      }}
                    >
                      {t('calendar.cancelEvent')}
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              {t('calendar.upcoming')}
            </Typography>
            <Stack spacing={1}>
              {!loading && data?.upcoming.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('calendar.emptyUpcoming')}
                </Typography>
              )}
              {data?.upcoming.map((event) => (
                <ButtonBase
                  key={event.id}
                  data-testid={`calendar-upcoming-${event.id}`}
                  onClick={() => selectDay(calendarDay(event.startTimeUtc))}
                  sx={{
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                    p: 1,
                    borderRadius: 1,
                    textAlign: 'left',
                    '&:hover': { bgcolor: 'action.hover' },
                    '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, overflowWrap: 'anywhere', maxWidth: '100%' }}
                  >
                    {event.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {calendarTime(event.startTimeUtc)}
                  </Typography>
                </ButtonBase>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Box>
      {form && (
        <EventForm
          key={form.key}
          event={form.event}
          selectedDay={selectedDay}
          onClose={closeForm}
          onSaved={() => {
            setForm(null);
            setNotice('calendar.saved');
          }}
        />
      )}
      <Dialog
        open={cancelling !== null}
        onClose={() => {
          if (!cancelPending) setCancelling(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('calendar.cancelEvent')}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {cancelError && <Alert severity="error">{t(cancelError)}</Alert>}
            <DialogContentText>
              {t('calendar.cancelQuestion', { title: cancelling?.title ?? '' })}
            </DialogContentText>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={cancelPending} onClick={() => setCancelling(null)}>
            {t('common.cancel')}
          </Button>
          <Button color="error" disabled={cancelPending} onClick={cancelEvent}>
            {t('calendar.confirmCancellation')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
