import * as RecycleBinAPI from '@/api/admin/maintenance/recycle-bin';
import { classifyApiFailure } from '@/api/config';
import { showSnackbar, type SnackbarHandle, type SnackbarAction } from '@/components/Notification';
import { createTranslator, getPreferredLangCode } from '@/hooks/useTranslation';
import {
  isCurrentAuthSession,
  subscribeAuthChanges,
  TOTP_GATE_REQUIRED_EVENT,
  type AuthSessionSnapshot,
} from './auth';

type UndoInput = NonNullable<Parameters<typeof RecycleBinAPI.undoFn>[0]['data']>;
export type DeleteUndoReceipt = UndoInput & { undoExpiresTimeUtc: number; serverTimeUtc: number };
export interface UndoRequestTime {
  monotonic: number;
  wall: number;
}
export const captureUndoRequestTime = (): UndoRequestTime => ({
  monotonic: performance.now(),
  wall: Date.now(),
});

type ResourceListener = (presentation: 'local' | 'page') => Promise<boolean>;
const RESOURCE_LISTENERS = Symbol.for('hodor:resource-change-listeners');
const host = globalThis as typeof globalThis & {
  [RESOURCE_LISTENERS]?: Map<string, Set<ResourceListener>>;
};
const listeners = (host[RESOURCE_LISTENERS] ??= new Map<string, Set<ResourceListener>>());

export function subscribeResourceChanges(
  resourceType: string,
  listener: ResourceListener,
): () => void {
  const resourceListeners = listeners.get(resourceType) ?? new Set<ResourceListener>();
  listeners.set(resourceType, resourceListeners);
  resourceListeners.add(listener);
  return () => {
    resourceListeners.delete(listener);
    if (!resourceListeners.size) listeners.delete(resourceType);
  };
}

export async function publishResourceChange(
  resourceType: string,
  presentation: 'local' | 'page' = 'local',
): Promise<boolean> {
  const results = await Promise.allSettled(
    [...(listeners.get(resourceType) ?? [])].map((listener) =>
      Promise.resolve().then(() => listener(presentation)),
    ),
  );
  return results.every((result) => result.status === 'fulfilled' && result.value);
}

interface DeleteUndoOptions {
  receipt: unknown;
  resourceType: string;
  id: number | string;
  name: string;
  session: AuthSessionSnapshot;
  requestStartedAt: UndoRequestTime;
  canOpenRecycleBin: () => boolean;
  verifyCurrent?: () => Promise<true | null>;
  deletionFailure?: ReturnType<typeof classifyApiFailure>;
  retryableErrorCodes?: readonly string[];
  stateChangedErrorCodes?: readonly string[];
}

function validReceipt(
  value: unknown,
  resourceType: string,
  id: number | string,
): value is DeleteUndoReceipt {
  if (
    !value ||
    typeof value !== 'object' ||
    !('resourceType' in value) ||
    !('id' in value) ||
    !('expectedDeletedTimeUtc' in value) ||
    !('undoExpiresTimeUtc' in value) ||
    !('serverTimeUtc' in value)
  )
    return false;
  const {
    expectedDeletedTimeUtc: deleted,
    undoExpiresTimeUtc: expires,
    serverTimeUtc: server,
  } = value;
  return (
    value.resourceType === resourceType &&
    value.id === id &&
    typeof deleted === 'number' &&
    Number.isSafeInteger(deleted) &&
    deleted > 0 &&
    typeof expires === 'number' &&
    Number.isSafeInteger(expires) &&
    expires - deleted === 15_000 &&
    typeof server === 'number' &&
    Number.isSafeInteger(server) &&
    server >= deleted
  );
}

/** Owns a single deletion receipt; no page component or business API is retained. */
export function showDeleteUndo(options: DeleteUndoOptions): SnackbarHandle | null {
  const { name, session, requestStartedAt, resourceType, id } = options;
  const receipt = validReceipt(options.receipt, resourceType, id) ? options.receipt : null;
  if (!isCurrentAuthSession(session)) return null;
  const t = createTranslator(getPreferredLangCode());
  let phase:
    | 'ready'
    | 'pending'
    | 'failure'
    | 'unknown'
    | 'deleteUnknown'
    | 'deleteFailure'
    | 'available'
    | 'success'
    | 'changed'
    | 'expired'
    | 'forbidden' = receipt
    ? 'ready'
    : options.deletionFailure?.kind === 'business'
      ? 'deleteFailure'
      : 'deleteUnknown';
  let failureMessage = '';
  let retryAllowed = false;
  let refreshFailed = false;
  let refreshing = false;
  let closed = false;
  let lastPresentation = '';
  let maximumElapsed = 0;
  let outcomeVersion = 0;
  let stopAuth = () => {};

  const remaining = () => {
    if (!receipt) return 0;
    // The whole round trip is conservatively deducted. Wall elapsed also covers
    // devices where the monotonic clock pauses during sleep; it can never extend a receipt.
    maximumElapsed = Math.max(
      maximumElapsed,
      performance.now() - requestStartedAt.monotonic,
      Date.now() - requestStartedAt.wall,
      0,
    );
    return Math.max(0, receipt.undoExpiresTimeUtc - receipt.serverTimeUtc - maximumElapsed);
  };
  const current = () => {
    if (isCurrentAuthSession(session)) return true;
    handle.close();
    return false;
  };
  const dismiss = () => {
    closed = true;
    clearInterval(timer);
    stopAuth();
    document.removeEventListener('visibilitychange', tick);
    document.removeEventListener('resume', tick);
    window.removeEventListener('pageshow', tick);
    window.removeEventListener(TOTP_GATE_REQUIRED_EVENT, handle.close);
  };
  const handle = showSnackbar({
    message: t(receipt ? 'deleteUndo.deleted' : 'deleteUndo.deleteUnknown', { name }),
    type: receipt ? 'success' : 'warning',
    duration: 0,
    onDismiss: dismiss,
  });

  async function refresh() {
    if (closed || refreshing || !current()) return;
    outcomeVersion += 1;
    refreshing = true;
    render();
    const refreshed = await publishResourceChange(resourceType);
    if (!current()) return;
    refreshFailed = !refreshed;
    if (
      (phase === 'unknown' || phase === 'deleteUnknown' || phase === 'changed') &&
      options.verifyCurrent
    ) {
      const active = await options.verifyCurrent();
      if (!current()) return;
      if (active) phase = 'available';
    }
    refreshing = false;
    render();
  }

  async function undo() {
    if (!receipt || closed || phase === 'pending' || refreshing || !current()) return;
    if (remaining() <= 0) {
      tick();
      return;
    }
    if (phase !== 'ready' && !retryAllowed) return;
    const operation = ++outcomeVersion;
    phase = 'pending';
    render();
    const result = await RecycleBinAPI.undoFn({
      data: {
        resourceType: receipt.resourceType,
        id: receipt.id,
        expectedDeletedTimeUtc: receipt.expectedDeletedTimeUtc,
      },
      errorPresentation: 'local',
    }).then(
      (response) =>
        response.data?.ok === true && response.data.data === receipt.id
          ? { ok: true as const }
          : {
              ok: false as const,
              failure: { kind: 'unknown' as const, code: null, message: null },
            },
      (error: unknown) => ({ ok: false as const, failure: classifyApiFailure(error) }),
    );
    if (!current()) return;
    if (result.ok) {
      phase = 'success';
      retryAllowed = false;
      refreshing = true;
      render();
      const refreshed = await publishResourceChange(resourceType);
      if (!current()) return;
      refreshFailed = !refreshed;
      refreshing = false;
      render();
      return;
    }
    const { kind, code, message } = result.failure;
    if (kind === 'session') {
      handle.close();
      return;
    }
    failureMessage = message ?? t('deleteUndo.failed');
    if (kind === 'unknown') {
      phase = 'unknown';
      retryAllowed = true;
    } else if (code === 'errorHandler.recycleBin.undoExpired') {
      phase = 'expired';
      retryAllowed = false;
    } else if (code === 'errorHandler.recycleBin.undoForbidden' || code === 'PERMISSION_DENIED') {
      phase = 'forbidden';
      retryAllowed = false;
    } else if (code && options.stateChangedErrorCodes?.includes(code)) {
      phase = 'changed';
      retryAllowed = false;
    } else {
      phase = 'failure';
      retryAllowed = !!code && !!options.retryableErrorCodes?.includes(code);
    }
    render();
    if (phase === 'unknown' && options.verifyCurrent && !closed) {
      // A slow read must not consume the remaining opportunity to retry the same
      // write. Its late result cannot replace a newer retry or manual refresh.
      void options.verifyCurrent().then(
        (active) => {
          if (closed || !current() || operation !== outcomeVersion || phase !== 'unknown') return;
          if (active) {
            phase = 'available';
            retryAllowed = false;
            render();
            void refresh();
          }
        },
        () => {
          /* An unavailable read cannot resolve an unknown write outcome. */
        },
      );
    }
  }

  function render() {
    if (closed || !current()) return;
    const seconds = Math.ceil(remaining() / 1000);
    const mayRetry = retryAllowed && seconds > 0;
    let action: SnackbarAction | undefined;
    let secondaryAction: SnackbarAction | undefined;
    let message: string;
    let detail = '';
    if (phase === 'ready' || phase === 'pending') {
      message = t('deleteUndo.deleted', { name });
      detail =
        phase === 'pending' ? t('deleteUndo.submitting') : t('deleteUndo.remaining', { seconds });
      action = {
        label: t(phase === 'pending' ? 'deleteUndo.undoing' : 'deleteUndo.action'),
        onClick: undo,
        loading: phase === 'pending',
      };
    } else if (phase === 'success') {
      message = t('deleteUndo.succeeded', { name });
      detail = refreshFailed
        ? t('deleteUndo.refreshFailed')
        : refreshing
          ? t('deleteUndo.refreshing')
          : '';
    } else if (phase === 'unknown') {
      message = t('deleteUndo.unknown', { name });
    } else if (phase === 'deleteUnknown') {
      message = t('deleteUndo.deleteUnknown', { name });
    } else if (phase === 'deleteFailure') {
      message = t('deleteUndo.deleteFailure', {
        name,
        reason: options.deletionFailure?.message ?? t('deleteUndo.failed'),
      });
    } else if (phase === 'available') {
      message = t('deleteUndo.available', { name });
    } else if (phase === 'changed') {
      message = t('deleteUndo.changed', { name });
    } else if (phase === 'forbidden') {
      message = t('deleteUndo.forbidden', { name });
    } else if (phase === 'expired') {
      message = t('deleteUndo.expired', { name });
    } else {
      message = t('deleteUndo.failure', { name, reason: failureMessage });
    }
    if (mayRetry && phase !== 'pending') {
      action = { label: t('deleteUndo.retry'), onClick: undo, disabled: refreshing };
      detail = t('deleteUndo.remaining', { seconds });
    }
    if (
      refreshFailed ||
      phase === 'unknown' ||
      phase === 'deleteUnknown' ||
      phase === 'deleteFailure' ||
      phase === 'changed' ||
      phase === 'available'
    ) {
      secondaryAction = { label: t('common.refresh'), onClick: refresh, loading: refreshing };
      if (refreshFailed && phase !== 'success') detail = t('deleteUndo.refreshFailed');
    }
    if (
      phase !== 'pending' &&
      (phase === 'expired' || (retryAllowed && seconds === 0)) &&
      !refreshing
    ) {
      if (options.canOpenRecycleBin()) {
        detail = t('deleteUndo.recycleHelp');
        const recoveryAction = {
          label: t('deleteUndo.openRecycleBin'),
          onClick: () => {
            if (closed || !current() || !options.canOpenRecycleBin()) return;
            window.location.hash = '/admin/recycle-bin';
          },
        };
        if (secondaryAction) action = recoveryAction;
        else secondaryAction = recoveryAction;
      } else detail = t('deleteUndo.contactAdmin');
    }
    const signature = JSON.stringify([
      phase,
      message,
      detail,
      action?.label,
      action?.disabled,
      action?.loading,
      secondaryAction?.label,
      refreshing,
      refreshFailed,
    ]);
    if (lastPresentation === signature) return;
    lastPresentation = signature;
    handle.update({
      message,
      detail,
      action,
      secondaryAction,
      type:
        phase === 'ready' || (phase === 'success' && !refreshFailed)
          ? 'success'
          : phase === 'pending'
            ? 'info'
            : 'warning',
      duration: phase === 'success' && !refreshing && !refreshFailed ? 3000 : 0,
    });
  }

  function tick() {
    if (closed || !current()) return;
    if (phase === 'ready' && remaining() <= 0) phase = 'expired';
    render();
  }
  stopAuth = subscribeAuthChanges(() => {
    if (!isCurrentAuthSession(session)) handle.close();
  });
  const timer = setInterval(tick, 200);
  document.addEventListener('visibilitychange', tick);
  document.addEventListener('resume', tick);
  window.addEventListener('pageshow', tick);
  window.addEventListener(TOTP_GATE_REQUIRED_EVENT, handle.close);
  tick();
  return handle;
}
