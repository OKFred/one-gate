import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import * as TaskAPI from '@/api/admin/mobile/async-task';
import type { DeviceTaskState } from '@/api/admin/mobile/async-task';
import { classifyApiFailure } from '@/api/config';
import { ConfirmationDialog } from '@/components/Notification/ConfirmationDialog';
import { ResponsiveButton } from '@/components/Responsive';
import { permissions, usePermission } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';

type TaskSnapshot = NonNullable<DeviceTaskState['snapshot']>;
type TaskItem = NonNullable<TaskSnapshot['running']>;
type Notice = { key: string; severity: 'success' | 'warning' | 'error' };
type Confirmation = { task: TaskItem; sessionId: string; revision: number; generation: number };

const TASK_PERMISSION = permissions.admin.mobile.async_task;
const FRESHNESS_MS = 60_000;

function isFresh(value: DeviceTaskState | null, observedAt: number) {
  return (
    value !== null &&
    value.snapshot !== null &&
    !value.stale &&
    value.receivedTimeUtc !== null &&
    Math.max(0, value.serverTimeUtc - value.receivedTimeUtc) +
      Math.max(0, performance.now() - observedAt) <
      FRESHNESS_MS
  );
}

/** Device-reported runtime and queue; dispatch acknowledgement is not a terminal result. */
export function DeviceTaskPanel({ clientId }: { clientId: string }) {
  const t = useTranslation();
  const { hasAllPermissions } = usePermission();
  const canRead = hasAllPermissions([TASK_PERMISSION.read]);
  const canDispatch = hasAllPermissions([TASK_PERMISSION.dispatch]);
  const [state, setState] = useState<DeviceTaskState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [, setClock] = useState(0);
  const scope = useRef({ active: true, auth: captureAuthSession() });
  const permission = useRef({ canRead, canDispatch });
  permission.current = { canRead, canDispatch };
  const data = useRef<DeviceTaskState | null>(null);
  const observedAt = useRef(0);
  const generation = useRef(0);
  const readSequence = useRef(0);
  const readController = useRef<AbortController | null>(null);
  const reading = useRef(false);
  const writeController = useRef<AbortController | null>(null);
  const actionLock = useRef<'confirm' | 'write' | null>(null);
  const writeTask = useRef<string | null>(null);
  const unresolvedTasks = useRef(new Set<string>());
  const failedRead = useRef(false);

  const current = useCallback(
    () => scope.current.active && isCurrentAuthSession(scope.current.auth),
    [],
  );

  const cancellable = (taskId: string) =>
    current() &&
    document.visibilityState === 'visible' &&
    permission.current.canRead &&
    permission.current.canDispatch &&
    !failedRead.current &&
    isFresh(data.current, observedAt.current) &&
    data.current?.cancellableTaskIds.includes(taskId) === true &&
    !unresolvedTasks.current.has(taskId);

  const refresh = useCallback(
    (manual = false) => {
      if (
        !current() ||
        !permission.current.canRead ||
        document.visibilityState !== 'visible' ||
        actionLock.current === 'write' ||
        (!manual && reading.current)
      )
        return;
      const sequence = ++readSequence.current;
      const view = generation.current;
      readController.current?.abort();
      const abort = new AbortController();
      readController.current = abort;
      reading.current = true;
      const live = () =>
        current() &&
        view === generation.current &&
        sequence === readSequence.current &&
        !abort.signal.aborted &&
        document.visibilityState === 'visible';
      setLoading(true);
      void TaskAPI.stateFn({
        data: { clientId },
        signal: abort.signal,
        ignoreAbort: true,
        errorPresentation: 'local',
        shouldPresentError: live,
      })
        .then(
          (response) => {
            if (!live()) return;
            if (
              response.data.ok !== true ||
              !response.data.data ||
              response.data.data.clientId !== clientId
            ) {
              failedRead.current = true;
              setLoadFailed(true);
              return;
            }
            data.current = response.data.data;
            observedAt.current = performance.now();
            if (manual && isFresh(data.current, observedAt.current)) {
              for (const taskId of data.current.cancellableTaskIds)
                unresolvedTasks.current.delete(taskId);
            }
            setState(data.current);
            failedRead.current = false;
            setLoadFailed(false);
          },
          (failure: unknown) => {
            if (!live() || classifyApiFailure(failure).kind === 'session') return;
            failedRead.current = true;
            setLoadFailed(true);
          },
        )
        .finally(() => {
          if (live()) {
            reading.current = false;
            setLoading(false);
          }
        });
    },
    [clientId, current],
  );

  useEffect(() => {
    const session = scope.current;
    session.active = true;
    const invalidate = () => {
      generation.current += 1;
      readSequence.current += 1;
      readController.current?.abort();
      reading.current = false;
      setLoading(false);
      setConfirmation(null);
      if (actionLock.current === 'confirm') actionLock.current = null;
    };
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(session.auth)) return;
      session.active = false;
      invalidate();
      writeController.current?.abort();
      data.current = null;
      setState(null);
      setNotice(null);
      setLoadFailed(false);
      setPending(null);
    });
    const visibility = () => {
      invalidate();
      if (actionLock.current === 'write' && writeTask.current) {
        unresolvedTasks.current.add(writeTask.current);
        setNotice({ key: 'mobile.taskRuntime.unknown', severity: 'warning' });
      }
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', visibility);
    let ticks = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setClock((value) => value + 1);
      if (++ticks % 5 === 0) refresh();
    }, 1000);
    return () => {
      session.active = false;
      generation.current += 1;
      readSequence.current += 1;
      readController.current?.abort();
      reading.current = false;
      writeController.current?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (canRead) {
      refresh();
      return;
    }
    readSequence.current += 1;
    readController.current?.abort();
    reading.current = false;
    data.current = null;
    setState(null);
    setLoading(false);
    failedRead.current = false;
    setLoadFailed(false);
  }, [canRead, refresh]);

  useEffect(() => {
    if (canRead && canDispatch) return;
    setConfirmation(null);
    if (actionLock.current === 'confirm') actionLock.current = null;
  }, [canDispatch, canRead]);

  const requestConfirmation = (task: TaskItem) => {
    const snapshot = data.current?.snapshot;
    if (!snapshot || !cancellable(task.taskId) || task.phase === 'STARTING' || actionLock.current)
      return;
    actionLock.current = 'confirm';
    setConfirmation({
      task,
      sessionId: snapshot.sessionId,
      revision: snapshot.revision,
      generation: generation.current,
    });
  };

  const confirmCancellation = async (confirmed: boolean) => {
    if (!confirmation || actionLock.current !== 'confirm') return;
    const selection = confirmation;
    setConfirmation(null);
    actionLock.current = null;
    if (!confirmed) return;
    const snapshot = data.current?.snapshot;
    if (
      !cancellable(selection.task.taskId) ||
      loading ||
      selection.generation !== generation.current ||
      snapshot?.sessionId !== selection.sessionId ||
      snapshot.revision !== selection.revision
    ) {
      if (current()) setNotice({ key: 'mobile.taskRuntime.changed', severity: 'warning' });
      return;
    }
    actionLock.current = 'write';
    writeTask.current = selection.task.taskId;
    readSequence.current += 1;
    readController.current?.abort();
    reading.current = false;
    setLoading(false);
    setPending(selection.task.taskId);
    setNotice(null);
    const view = generation.current;
    const abort = new AbortController();
    writeController.current = abort;
    const live = () => current() && view === generation.current && !abort.signal.aborted;
    let sent = false;
    try {
      const response = await TaskAPI.cancelFn({
        data: { clientId, taskId: selection.task.taskId },
        signal: abort.signal,
        ignoreAbort: true,
        errorPresentation: 'local',
        shouldPresentError: live,
      });
      if (!live()) return;
      const result = response.data.data;
      if (
        response.data.ok !== true ||
        result.status !== 'CANCEL_REQUESTED' ||
        result.taskId !== selection.task.taskId ||
        !result.commandId
      ) {
        unresolvedTasks.current.add(selection.task.taskId);
        setNotice({ key: 'mobile.taskRuntime.unknown', severity: 'warning' });
        return;
      }
      unresolvedTasks.current.add(selection.task.taskId);
      setNotice({ key: 'mobile.taskRuntime.sent', severity: 'success' });
      sent = true;
    } catch (failure: unknown) {
      if (!live()) return;
      const classification = classifyApiFailure(failure);
      if (classification.kind === 'session') return;
      if (classification.kind === 'unknown') unresolvedTasks.current.add(selection.task.taskId);
      setNotice({
        key:
          classification.kind === 'unknown'
            ? 'mobile.taskRuntime.unknown'
            : 'mobile.taskRuntime.rejected',
        severity: classification.kind === 'unknown' ? 'warning' : 'error',
      });
    } finally {
      actionLock.current = null;
      writeTask.current = null;
      if (current()) setPending(null);
      if (sent && live()) refresh();
    }
  };

  const time = (value: number | null) =>
    value === null ? '—' : dayjs(value).format('YYYY-MM-DD HH:mm:ss');

  const renderTask = (task: TaskItem) => (
    <Box
      key={task.taskId}
      data-testid={`device-task-${task.taskId}`}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
        <Chip size="small" label={t(`mobile.taskRuntime.phase.${task.phase}`)} />
        <Chip size="small" label={task.priority} />
        {task.position !== null && (
          <Chip
            size="small"
            label={t('mobile.taskRuntime.position', { position: task.position })}
          />
        )}
      </Stack>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{task.scriptId}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
        {t('mobile.asyncTask.taskId')}: {task.taskId}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('mobile.taskRuntime.enqueuedAt')}: {time(task.createdAt)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('mobile.taskRuntime.startedAt')}: {time(task.startedAt)}
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        <ResponsiveButton
          color="error"
          variant="outlined"
          permissionCodes={[TASK_PERMISSION.dispatch]}
          disabled={
            !cancellable(task.taskId) || task.phase === 'STARTING' || pending !== null || loading
          }
          onClick={() => requestConfirmation(task)}
        >
          {pending === task.taskId ? t('common.loading') : t('mobile.taskRuntime.cancel')}
        </ResponsiveButton>
        {unresolvedTasks.current.has(task.taskId) ? (
          <Typography variant="caption">{t('mobile.taskRuntime.awaitingResult')}</Typography>
        ) : (
          (!state?.cancellableTaskIds.includes(task.taskId) || task.phase === 'STARTING') && (
            <Typography variant="caption">{t('mobile.taskRuntime.unavailable')}</Typography>
          )
        )}
      </Stack>
    </Box>
  );

  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">{t('mobile.taskRuntime.title')}</Typography>
        <ResponsiveButton
          variant="outlined"
          size="small"
          startIcon={<Refresh />}
          disabled={!canRead || pending !== null}
          onClick={() => refresh(true)}
        >
          {t('common.refresh')}
        </ResponsiveButton>
      </Stack>
      {loading && <LinearProgress aria-label={t('common.loading')} />}
      {!canRead && <Alert severity="info">{t('mobile.taskRuntime.noPermission')}</Alert>}
      {notice && (
        <Alert severity={notice.severity} onClose={() => setNotice(null)}>
          {t(notice.key)}
        </Alert>
      )}
      {loadFailed && <Alert severity="error">{t('mobile.taskRuntime.loadFailed')}</Alert>}
      {canRead && state?.snapshot === null && (
        <Alert severity="info">{t('mobile.taskRuntime.noSnapshot')}</Alert>
      )}
      {canRead && state?.snapshot && (
        <>
          <Typography variant="body2" color="text.secondary">
            {t('mobile.taskRuntime.updatedAt')}: {time(state.receivedTimeUtc)}
          </Typography>
          {!isFresh(state, observedAt.current) && (
            <Alert severity="warning">{t('mobile.taskRuntime.stale')}</Alert>
          )}
          <Typography variant="subtitle1">{t('mobile.taskRuntime.running')}</Typography>
          {state.snapshot.running ? (
            renderTask(state.snapshot.running)
          ) : (
            <Typography color="text.secondary">{t('mobile.taskRuntime.noRunning')}</Typography>
          )}
          <Typography variant="subtitle1">{t('mobile.taskRuntime.queued')}</Typography>
          {state.snapshot.queued.length ? (
            state.snapshot.queued.map(renderTask)
          ) : (
            <Typography color="text.secondary">{t('mobile.taskRuntime.noQueued')}</Typography>
          )}
        </>
      )}
      {confirmation && (
        <ConfirmationDialog
          destructive
          title={t('mobile.taskRuntime.cancel')}
          message={t('mobile.taskRuntime.confirm', { taskId: confirmation.task.taskId })}
          confirmText={t('mobile.taskRuntime.cancel')}
          onResult={(confirmed) => void confirmCancellation(confirmed)}
          onExited={() => setConfirmation(null)}
        />
      )}
    </Stack>
  );
}
