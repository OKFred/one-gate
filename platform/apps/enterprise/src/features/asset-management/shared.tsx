import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import * as TenantAPI from '@/api/enterprise/tenant';
import { useTranslation, getTranslations, mergeTranslations } from '@/hooks/useTranslation';
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
    const snapshot = scope.capture();
    const requestedKey = keyRef.current;
    const accepts = () =>
      scope.accepts(snapshot) && sequence.current === version && requestedKey === keyRef.current;
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
  }, [scope.capture, scope.accepts]);
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

export function QueryStatus({
  loading,
  failed,
  refresh,
}: {
  loading: boolean;
  failed: boolean;
  refresh: () => Promise<unknown>;
}) {
  const t = useTranslation();
  if (loading)
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress aria-label={t('common.loading')} size={28} />
      </Box>
    );
  if (failed)
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => void refresh()}>
            {t('common.refresh')}
          </Button>
        }
      >
        {t('assetManagement.loadFailed')}
      </Alert>
    );
  return null;
}

export function DataTable<T extends { id: number }>({
  rows,
  columns,
  actions,
  page,
  onPage,
  label,
}: {
  rows: T[];
  columns: { key: string; label: string; render: (row: T) => ReactNode }[];
  actions?: (row: T) => ReactNode;
  page?: PageData<T> | null;
  onPage?: (page: number) => void;
  label: string;
}) {
  const t = useTranslation();
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" aria-label={label}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.key}>{column.label}</TableCell>
              ))}
              {actions && <TableCell>{t('table.actions')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.render(row)}</TableCell>
                ))}
                {actions && (
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {actions(row)}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {t('column.noData')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {page && onPage && (
        <TablePagination
          component="div"
          count={page.total}
          rowsPerPage={page.pageSize}
          page={Math.max(0, page.currentPage - 1)}
          onPageChange={(_, next) => onPage(next + 1)}
          rowsPerPageOptions={[]}
        />
      )}
    </Paper>
  );
}

export function TenantChooser({
  tenants,
  value,
  onChange,
}: {
  tenants: TenantRow[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  const t = useTranslation();
  return (
    <TextField
      select
      label={t('assetManagement.enterprise')}
      value={value ?? ''}
      onChange={(event) => onChange(Number(event.target.value))}
      sx={{ minWidth: 260 }}
    >
      {tenants.map((tenant) => (
        <MenuItem key={tenant.id} value={tenant.id}>
          {tenant.name} · {tenant.key}
          {tenant.frozen ? ` (${t('tenantManagement.frozen')})` : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}
