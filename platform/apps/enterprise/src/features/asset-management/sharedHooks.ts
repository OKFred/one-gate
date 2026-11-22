import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dayjs from 'dayjs';
import * as TenantAPI from '@/api/enterprise/tenant';
import { getTranslations, mergeTranslations } from '@/hooks/useTranslation';
import {
  captureAuthSession,
  isCurrentAuthSession,
  subscribeAuthChanges,
  type AuthSessionSnapshot,
} from '@/utils/auth';
import { assetManagement as english } from '../../locales/en-US/assets';
import { assetManagement as chinese } from '../../locales/zh-CN/assets';

// Federated pages load independently of the standalone App. Already-loaded server overrides win.
mergeTranslations('en-US', { ...english, ...getTranslations('en-US') });
mergeTranslations('zh-CN', { ...chinese, ...getTranslations('zh-CN') });

export type TenantRow = Awaited<
  ReturnType<typeof TenantAPI.listFn>
>['data']['data']['list'][number];
export type PageData<T> = {
  list: T[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPage: number;
};
export type ScopeSnapshot = { generation: number; session: AuthSessionSnapshot };
export type QueryRefreshResult = 'success' | 'failed' | 'stale';
type ScopeRequestOptions = { shouldPresentError: () => boolean };

export function useRequestScope(identity: string) {
  const session = useSyncExternalStore(subscribeAuthChanges, captureAuthSession);
  const state = useRef({ identity, revision: session.revision, generation: 0 });
  const mounted = useRef(false);
  if (state.current.identity !== identity || state.current.revision !== session.revision) {
    state.current = {
      identity,
      revision: session.revision,
      generation: state.current.generation + 1,
    };
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      state.current.generation += 1;
    };
  }, []);
  const capture = useCallback(
    (): ScopeSnapshot => ({ generation: state.current.generation, session: captureAuthSession() }),
    [],
  );
  const accepts = useCallback(
    (snapshot: ScopeSnapshot) =>
      mounted.current &&
      snapshot.generation === state.current.generation &&
      isCurrentAuthSession(snapshot.session),
    [],
  );
  return { key: `${session.revision}:${identity}`, capture, accepts };
}

export function useScopedQuery<T>(
  scope: ReturnType<typeof useRequestScope>,
  queryKey: string,
  request: (options: ScopeRequestOptions) => Promise<T>,
) {
  const { capture, accepts: scopeAccepts } = scope;
  const requestRef = useRef(request);
  requestRef.current = request;
  const sequence = useRef(0);
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    loading: boolean;
    failed: boolean;
  }>({ key: '', data: null, loading: true, failed: false });
  const key = `${scope.key}:${queryKey}`;
  const keyRef = useRef(key);
  keyRef.current = key;
  const refresh = useCallback(async (): Promise<QueryRefreshResult> => {
    const version = ++sequence.current;
    const snapshot = capture();
    const requestedKey = keyRef.current;
    const accepts = () =>
      scopeAccepts(snapshot) && sequence.current === version && requestedKey === keyRef.current;
    setResult({ key: requestedKey, data: null, loading: true, failed: false });
    try {
      const data = await requestRef.current({ shouldPresentError: accepts });
      if (!accepts()) return 'stale';
      setResult({ key: requestedKey, data, loading: false, failed: false });
      return 'success';
    } catch {
      if (!accepts()) return 'stale';
      setResult({ key: requestedKey, data: null, loading: false, failed: true });
      return 'failed';
    }
  }, [capture, scopeAccepts]);
  useEffect(() => {
    void refresh();
    return () => {
      sequence.current += 1;
    };
  }, [key, refresh]);
  return {
    data: result.key === key ? result.data : null,
    loading: result.key !== key || result.loading,
    failed: result.key === key && result.failed,
    refresh,
  };
}

export function useScopedMutation(scope: ReturnType<typeof useRequestScope>) {
  const inFlight = useRef<symbol | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    inFlight.current = null;
    setBusy(false);
  }, [scope.key]);
  const run = async (
    request: (options: ScopeRequestOptions) => Promise<unknown>,
  ): Promise<boolean> => {
    if (inFlight.current) return false;
    const operation = Symbol('tenant-mutation');
    const snapshot = scope.capture();
    inFlight.current = operation;
    setBusy(true);
    try {
      await request({
        shouldPresentError: () => inFlight.current === operation && scope.accepts(snapshot),
      });
      return scope.accepts(snapshot);
    } catch {
      return false;
    } finally {
      if (inFlight.current === operation) {
        inFlight.current = null;
        if (scope.accepts(snapshot)) setBusy(false);
      }
    }
  };
  return { busy, run };
}

export const formatTime = (value: number | null | undefined) =>
  value == null ? '—' : dayjs(value).format('YYYY-MM-DD HH:mm:ss');
export const localNow = () => dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
export const parseTime = (value: string) => dayjs(value).valueOf();
export const emptyToNull = (value: string) => value.trim() || null;
