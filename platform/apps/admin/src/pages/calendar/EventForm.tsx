import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  addFn,
  updateFn,
  type CalendarAddInput,
  type CalendarEvent,
} from '@/api/personal/calendar';
import { notifyCalendarChanged } from '@/api/personal/calendar-events';
import { classifyApiFailure } from '@/api/config';
import { useTranslation } from '@/hooks/useTranslation';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import { calendarFailureKey } from './calendar-errors';
import { CALENDAR_TIME_ZONE, calendarInput, calendarTimestamp } from './calendar-time';

type ReminderOption = '0' | '15' | '1440' | 'none' | 'custom';

function initialReminder(event: CalendarEvent | null): ReminderOption {
  if (!event) return '0';
  if (event.reminderTimeUtc === null) return 'none';
  const minutes = (event.startTimeUtc - event.reminderTimeUtc) / 60000;
  return minutes === 0 || minutes === 15 || minutes === 1440
    ? (String(minutes) as ReminderOption)
    : 'custom';
}

export default function EventForm({
  event,
  selectedDay,
  onClose,
  onSaved,
}: {
  event: CalendarEvent | null;
  selectedDay: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslation();
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [url, setUrl] = useState(event?.url ?? '');
  const [start, setStart] = useState(
    event ? calendarInput(event.startTimeUtc) : `${selectedDay}T09:00`,
  );
  const [end, setEnd] = useState(event?.endTimeUtc != null ? calendarInput(event.endTimeUtc) : '');
  const [reminder, setReminder] = useState<ReminderOption>(() => initialReminder(event));
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [terminalConflict, setTerminalConflict] = useState(false);
  const lock = useRef(false);
  const requestKey = useRef(crypto.randomUUID());
  const submitted = useRef<Required<CalendarAddInput> | null>(null);
  const lifetime = useRef({ active: true, auth: captureAuthSession() });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const scope = lifetime.current;
    scope.active = true;
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(scope.auth)) return;
      scope.active = false;
      controller.current?.abort();
      onClose();
    });
    return () => {
      scope.active = false;
      controller.current?.abort();
      unsubscribe();
    };
  }, [onClose]);

  const changed = () => {
    if (submitted.current && !uncertain) {
      requestKey.current = crypto.randomUUID();
      submitted.current = null;
    }
    setErrorKey(null);
  };

  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lock.current || terminalConflict || !lifetime.current.active) return;
    let payload = submitted.current;
    if (!uncertain || !payload) {
      const startTimeUtc =
        event && start === calendarInput(event.startTimeUtc)
          ? event.startTimeUtc
          : calendarTimestamp(start);
      const endTimeUtc =
        event?.endTimeUtc != null && end === calendarInput(event.endTimeUtc)
          ? event.endTimeUtc
          : end
            ? calendarTimestamp(end)
            : null;
      const reminderTimeUtc =
        reminder === 'none'
          ? null
          : reminder === 'custom'
            ? (event?.reminderTimeUtc ?? null)
            : startTimeUtc - Number(reminder) * 60000;
      let safeUrl = url.trim() || null;
      if (safeUrl) {
        try {
          const parsed = new URL(safeUrl);
          if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') safeUrl = null;
        } catch {
          safeUrl = null;
        }
      }
      if (
        !title.trim() ||
        !Number.isFinite(startTimeUtc) ||
        (endTimeUtc !== null && (!Number.isFinite(endTimeUtc) || endTimeUtc < startTimeUtc)) ||
        (reminderTimeUtc !== null && reminderTimeUtc > startTimeUtc) ||
        (url.trim() && !safeUrl)
      ) {
        setErrorKey('calendar.validation');
        return;
      }
      payload = {
        requestKey: requestKey.current,
        title: title.trim(),
        description: description.trim() || null,
        url: safeUrl,
        startTimeUtc,
        endTimeUtc,
        timeZone: CALENDAR_TIME_ZONE,
        reminderTimeUtc,
      };
      submitted.current = payload;
    }
    lock.current = true;
    setSaving(true);
    setErrorKey(null);
    const scope = lifetime.current;
    const abort = new AbortController();
    controller.current = abort;
    const current = () => scope.active && isCurrentAuthSession(scope.auth) && !abort.signal.aborted;
    const options = {
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local' as const,
      shouldPresentError: current,
    };
    const { requestKey: createKey, ...editable } = payload;
    const request = event
      ? updateFn({
          ...options,
          data: { id: event.id, expectedVersion: event.version, ...editable },
        })
      : addFn({ ...options, data: { requestKey: createKey, ...editable } });
    void request
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setUncertain(true);
            setErrorKey('calendar.writeUnknown');
            return;
          }
          if (response.data.data.status === 'cancelled') {
            setTerminalConflict(true);
            setUncertain(true);
            setErrorKey('calendar.createCancelled');
            notifyCalendarChanged();
            return;
          }
          notifyCalendarChanged();
          onSaved();
        },
        (failure: unknown) => {
          if (!current()) return;
          setUncertain(classifyApiFailure(failure).kind === 'unknown');
          setErrorKey(calendarFailureKey(failure, 'calendar.writeUnknown'));
        },
      )
      .finally(() => {
        lock.current = false;
        if (current()) setSaving(false);
      });
  };

  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onClose();
      }}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={save}>
        <DialogTitle>{t(event ? 'calendar.edit' : 'calendar.new')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {errorKey && <Alert severity="error">{t(errorKey)}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              label={t('calendar.field.title')}
              value={title}
              disabled={saving || uncertain}
              slotProps={{ htmlInput: { maxLength: 160, 'data-testid': 'calendar-form-title' } }}
              onChange={(e) => {
                changed();
                setTitle(e.target.value);
              }}
            />
            <TextField
              required
              fullWidth
              type="datetime-local"
              label={t('calendar.field.start')}
              value={start}
              disabled={saving || uncertain}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { 'data-testid': 'calendar-form-start' },
              }}
              onChange={(e) => {
                changed();
                setStart(e.target.value);
              }}
            />
            <TextField
              fullWidth
              type="datetime-local"
              label={t('calendar.field.end')}
              value={end}
              disabled={saving || uncertain}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { 'data-testid': 'calendar-form-end' },
              }}
              onChange={(e) => {
                changed();
                setEnd(e.target.value);
              }}
            />
            <TextField
              select
              fullWidth
              label={t('calendar.field.reminder')}
              value={reminder}
              disabled={saving || uncertain}
              data-testid="calendar-form-reminder"
              onChange={(e) => {
                changed();
                setReminder(e.target.value as ReminderOption);
              }}
            >
              <MenuItem value="0">{t('calendar.reminder.atTime')}</MenuItem>
              <MenuItem value="15">{t('calendar.reminder.before15')}</MenuItem>
              <MenuItem value="1440">{t('calendar.reminder.beforeDay')}</MenuItem>
              <MenuItem value="none">{t('calendar.reminder.none')}</MenuItem>
              {initialReminder(event) === 'custom' && (
                <MenuItem value="custom">{t('calendar.reminder.custom')}</MenuItem>
              )}
            </TextField>
            <TextField
              fullWidth
              type="url"
              label={t('calendar.field.url')}
              value={url}
              disabled={saving || uncertain}
              slotProps={{ htmlInput: { maxLength: 2048, 'data-testid': 'calendar-form-url' } }}
              onChange={(e) => {
                changed();
                setUrl(e.target.value);
              }}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              label={t('calendar.field.description')}
              value={description}
              disabled={saving || uncertain}
              slotProps={{
                htmlInput: { maxLength: 4000, 'data-testid': 'calendar-form-description' },
              }}
              onChange={(e) => {
                changed();
                setDescription(e.target.value);
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {t('calendar.timeHelp')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('calendar.reminder.notice')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            {t(terminalConflict ? 'common.close' : 'common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || terminalConflict}
            data-testid="calendar-form-save"
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
