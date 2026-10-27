import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ContentCopy, ExpandMore, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  getFn,
  rotateFn,
  revokeFn,
  type CalendarSubscriptionStatus,
} from '@/api/personal/calendar-subscription';
import { classifyApiFailure } from '@/api/config';
import { useTranslation } from '@/hooks/useTranslation';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import { calendarTime } from './calendar-time';

type Mutation = 'rotate' | 'revoke';
type Secret = { url: string; version: number };

function secretUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash &&
      parsed.pathname === '/calendar-subscription.ics' &&
      [...parsed.searchParams].length === 1 &&
      /^ogcal1_[A-Za-z0-9_-]{43}$/.test(parsed.searchParams.get('token') ?? '')
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

function failureKey(failure: unknown, fallback: string): string | null {
  const result = classifyApiFailure(failure);
  if (result.kind === 'session') return null;
  if (result.code === 'CALENDAR_SUBSCRIPTION_STATE_CONFLICT')
    return 'calendar.subscription.conflict';
  if (result.code === 'CALENDAR_SUBSCRIPTION_UNAVAILABLE')
    return 'calendar.subscription.unavailable';
  return fallback;
}

export default function SubscriptionDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const [status, setStatus] = useState<CalendarSubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Mutation | null>(null);
  const [confirm, setConfirm] = useState<Mutation | null>(null);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [reveal, setReveal] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scope = useRef({ active: true, auth: captureAuthSession() });
  const generation = useRef(0);
  const readController = useRef<AbortController | null>(null);
  const writeController = useRef<AbortController | null>(null);
  const writeLock = useRef(false);

  const refresh = useCallback(() => {
    const session = scope.current;
    if (!session.active || !isCurrentAuthSession(session.auth) || writeLock.current) return;
    const sequence = ++generation.current;
    readController.current?.abort();
    const abort = new AbortController();
    readController.current = abort;
    const current = () =>
      session.active &&
      isCurrentAuthSession(session.auth) &&
      sequence === generation.current &&
      !abort.signal.aborted;
    setLoading(true);
    setNotice(null);
    void getFn({
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setError('calendar.subscription.loadFailed');
            return;
          }
          const next = response.data.data;
          setStatus(next);
          setSecret((previous) =>
            next.enabled && previous?.version === next.version ? previous : null,
          );
          setUnknown(false);
          setError(null);
        },
        (failure: unknown) => {
          if (current()) setError(failureKey(failure, 'calendar.subscription.loadFailed'));
        },
      )
      .finally(() => {
        if (current()) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const session = scope.current;
    session.active = true;
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(session.auth)) return;
      session.active = false;
      setSecret(null);
      readController.current?.abort();
      writeController.current?.abort();
      onClose();
    });
    refresh();
    return () => {
      session.active = false;
      generation.current += 1;
      readController.current?.abort();
      writeController.current?.abort();
      unsubscribe();
    };
  }, [onClose, refresh]);

  const mutate = () => {
    const session = scope.current;
    if (
      !confirm ||
      !status ||
      writeLock.current ||
      unknown ||
      !session.active ||
      !isCurrentAuthSession(session.auth)
    )
      return;
    const action = confirm;
    writeLock.current = true;
    generation.current += 1;
    readController.current?.abort();
    setLoading(false);
    setPending(action);
    setError(null);
    setNotice(null);
    setSecret(null);
    setReveal(false);
    const abort = new AbortController();
    writeController.current = abort;
    const current = () =>
      session.active && isCurrentAuthSession(session.auth) && !abort.signal.aborted;
    const options = {
      data: { expectedVersion: status.version },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local' as const,
      shouldPresentError: current,
    };
    const request = action === 'rotate' ? rotateFn(options) : revokeFn(options);
    void request
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setUnknown(true);
            setError('calendar.subscription.writeUnknown');
            setConfirm(null);
            return;
          }
          const next = response.data.data;
          const url =
            action === 'rotate' &&
            'subscriptionUrl' in next &&
            typeof next.subscriptionUrl === 'string'
              ? secretUrl(next.subscriptionUrl)
              : null;
          if (action === 'rotate' && !url) {
            setUnknown(true);
            setError('calendar.subscription.writeUnknown');
            setConfirm(null);
            return;
          }
          setStatus({
            configured: status.configured,
            enabled: action === 'rotate',
            version: next.version,
            updatedTimeUtc: next.updatedTimeUtc,
          });
          if (url) setSecret({ url, version: next.version });
          setUnknown(false);
          setNotice(
            action === 'rotate'
              ? 'calendar.subscription.generated'
              : 'calendar.subscription.revoked',
          );
          setConfirm(null);
        },
        (failure: unknown) => {
          if (!current()) return;
          setUnknown(classifyApiFailure(failure).kind === 'unknown');
          setError(failureKey(failure, 'calendar.subscription.writeUnknown'));
          setConfirm(null);
        },
      )
      .finally(() => {
        writeLock.current = false;
        if (current()) setPending(null);
      });
  };

  const copy = async () => {
    const session = scope.current;
    if (
      !secret ||
      loading ||
      writeLock.current ||
      !session.active ||
      !isCurrentAuthSession(session.auth)
    )
      return;
    const sequence = generation.current;
    const current = () =>
      session.active && isCurrentAuthSession(session.auth) && sequence === generation.current;
    try {
      await navigator.clipboard.writeText(secret.url);
      if (current()) {
        setError(null);
        setNotice('calendar.subscription.copied');
      }
    } catch {
      if (current()) setError('calendar.subscription.copyFailed');
    }
  };

  return (
    <>
      <Dialog
        open
        onClose={() => {
          if (!pending) onClose();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('calendar.subscription.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 0 }} data-testid="calendar-subscription-dialog">
            <Typography variant="body2" color="text.secondary">
              {t('calendar.subscription.intro')}
            </Typography>
            {loading && <LinearProgress aria-label={t('calendar.loading')} />}
            {error && <Alert severity="warning">{t(error)}</Alert>}
            {notice && <Alert severity="success">{t(notice)}</Alert>}
            {status && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={t(
                    status.enabled
                      ? 'calendar.subscription.enabled'
                      : 'calendar.subscription.disabled',
                  )}
                  color={status.enabled ? 'primary' : 'default'}
                />
                {status.updatedTimeUtc !== null && (
                  <Typography variant="caption" color="text.secondary">
                    {calendarTime(status.updatedTimeUtc)}
                  </Typography>
                )}
              </Stack>
            )}
            {status && !status.configured && (
              <Alert severity="info">{t('calendar.subscription.unavailable')}</Alert>
            )}
            {secret && (
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  type={reveal ? 'text' : 'password'}
                  label={t('calendar.subscription.address')}
                  value={secret.url}
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: (
                        <IconButton
                          aria-label={t(
                            reveal ? 'calendar.subscription.hide' : 'calendar.subscription.show',
                          )}
                          onClick={() => setReveal((v) => !v)}
                        >
                          {reveal ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      ),
                    },
                    htmlInput: {
                      'data-testid': 'calendar-subscription-url',
                      autoComplete: 'off',
                      spellCheck: false,
                    },
                  }}
                />
                <Button
                  startIcon={<ContentCopy />}
                  disabled={loading || !!pending}
                  onClick={() => void copy()}
                  data-testid="calendar-subscription-copy"
                >
                  {t('calendar.subscription.copy')}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {t('calendar.subscription.secretHelp')}
                </Typography>
              </Stack>
            )}
            {status?.enabled && !secret && (
              <Typography variant="body2" color="text.secondary">
                {t('calendar.subscription.existingHelp')}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Button
                variant="contained"
                disabled={!status?.configured || loading || !!pending || unknown}
                onClick={() => setConfirm('rotate')}
                data-testid="calendar-subscription-generate"
              >
                {t(
                  status?.enabled
                    ? 'calendar.subscription.rotate'
                    : 'calendar.subscription.generate',
                )}
              </Button>
              {status?.enabled && (
                <Button
                  color="error"
                  disabled={loading || !!pending || unknown}
                  onClick={() => setConfirm('revoke')}
                  data-testid="calendar-subscription-revoke"
                >
                  {t('calendar.subscription.revoke')}
                </Button>
              )}
              <Button
                disabled={loading || !!pending}
                onClick={refresh}
                data-testid="calendar-subscription-refresh"
              >
                {t('calendar.refresh')}
              </Button>
            </Stack>
            <Accordion disableGutters elevation={0} sx={{ '&::before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                {t('calendar.subscription.appleHelp')}
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  <Typography variant="body2">{t('calendar.subscription.iphone')}</Typography>
                  <Typography variant="body2">{t('calendar.subscription.mac')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('calendar.subscription.alerts')}
                  </Typography>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={!!pending} onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirm !== null}
        onClose={() => {
          if (!pending) setConfirm(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t(
            confirm === 'revoke'
              ? 'calendar.subscription.revoke'
              : status?.enabled
                ? 'calendar.subscription.rotate'
                : 'calendar.subscription.generate',
          )}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(
              confirm === 'revoke'
                ? 'calendar.subscription.revokeConfirm'
                : 'calendar.subscription.rotateConfirm',
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={!!pending} onClick={() => setConfirm(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color={confirm === 'revoke' ? 'error' : 'primary'}
            disabled={!!pending || unknown}
            onClick={mutate}
            data-testid="calendar-subscription-confirm"
          >
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
