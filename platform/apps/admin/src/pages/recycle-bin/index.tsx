import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
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
import * as RecycleBinAPI from '@/api/admin/maintenance/recycle-bin';
import { showSnackbar } from '@/components/Notification';
import { permissions, usePermission } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';

type Selection = {
  action: 'restore' | 'purge';
  item: RecycleBinAPI.RecycleBinItem;
};

type ClockAnchor = {
  serverTimeUtc: number;
  monotonicTime: number;
  wallTime: number;
};

const CLOCK_DRIFT_TOLERANCE_MS = 5000;

function readServerTime(anchor: ClockAnchor | null): number | null {
  if (!anchor) return null;
  const elapsed = performance.now() - anchor.monotonicTime;
  const wallElapsed = Date.now() - anchor.wallTime;
  if (elapsed < 0 || Math.abs(wallElapsed - elapsed) > CLOCK_DRIFT_TOLERANCE_MS) return null;
  return anchor.serverTimeUtc + elapsed;
}

export default function RecycleBinPage() {
  const t = useTranslation();
  const { hasAllPermissions, loading: permissionLoading } = usePermission();
  const canRead = hasAllPermissions([permissions.admin.maintenance.recycle_bin.read]);
  const [resources, setResources] = useState<RecycleBinAPI.ResourceDescriptor[] | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourcesFailed, setResourcesFailed] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState({ resourceType: '', keyword: '', pageNo: 1, pageSize: 10 });
  const [result, setResult] = useState<RecycleBinAPI.ListRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [listFailed, setListFailed] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const clockAnchor = useRef<ClockAnchor | null>(null);
  const needsRefresh = useRef(false);
  const requestVersion = useRef(0);
  const directoryVersion = useRef(0);
  const mutationInFlight = useRef(false);
  const resource = resources?.find((item) => item.resourceType === query.resourceType);
  const canRestore = resource?.canRestore === true && result?.canRestore === true;
  const canPurge = resource?.canPurge === true && result?.canPurge === true;

  const selectResource = (resourceType: string) => {
    requestVersion.current += 1;
    clockAnchor.current = null;
    setNow(null);
    setSelection(null);
    setResult(null);
    setListFailed(false);
    setKeyword('');
    setQuery((current) => ({ ...current, resourceType, keyword: '', pageNo: 1 }));
  };

  const loadResources = useCallback(async () => {
    if (permissionLoading || !canRead) return;
    const version = ++directoryVersion.current;
    requestVersion.current += 1;
    setResourceLoading(true);
    setResourcesFailed(false);
    setResources(null);
    clockAnchor.current = null;
    setNow(null);
    setResult(null);
    setSelection(null);
    setListFailed(false);
    setKeyword('');
    setQuery((current) => ({ ...current, resourceType: '', keyword: '', pageNo: 1 }));
    try {
      const response = await RecycleBinAPI.resourcesFn({ data: {} });
      if (version === directoryVersion.current) {
        const available = response.data.data.list;
        setResources(available);
        setQuery((current) => ({ ...current, resourceType: available[0]?.resourceType ?? '' }));
      }
    } catch {
      if (version === directoryVersion.current) setResourcesFailed(true);
    } finally {
      if (version === directoryVersion.current) setResourceLoading(false);
    }
  }, [canRead, permissionLoading]);

  useEffect(() => {
    void loadResources();
    return () => {
      directoryVersion.current += 1;
      requestVersion.current += 1;
    };
  }, [loadResources]);

  const refresh = useCallback(async () => {
    if (permissionLoading || !canRead || resourceLoading || !query.resourceType) return;
    if (mutationInFlight.current || document.visibilityState === 'hidden') {
      needsRefresh.current = true;
      return;
    }
    needsRefresh.current = false;
    const version = ++requestVersion.current;
    clockAnchor.current = null;
    setNow(null);
    setLoading(true);
    setListFailed(false);
    setResult(null);
    setSelection(null);
    try {
      const response = await RecycleBinAPI.listFn({
        data: query,
      });
      if (version === requestVersion.current) {
        const data = response.data.data;
        if (!Number.isSafeInteger(data.serverTimeUtc) || data.serverTimeUtc < 0) {
          setListFailed(true);
          return;
        }
        const lastPage = Math.max(1, data.totalPage);
        if (query.pageNo > lastPage) {
          setQuery((current) => ({ ...current, pageNo: lastPage }));
        } else {
          clockAnchor.current = {
            serverTimeUtc: data.serverTimeUtc,
            monotonicTime: performance.now(),
            wallTime: Date.now(),
          };
          setResult(data);
          setNow(data.serverTimeUtc);
        }
      }
    } catch {
      if (version === requestVersion.current) setListFailed(true);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [canRead, permissionLoading, query, resourceLoading]);

  const resyncClock = useCallback(() => {
    // A second lifecycle event must not invalidate an already-started synchronization.
    if (!clockAnchor.current && !needsRefresh.current) return;
    needsRefresh.current = true;
    clockAnchor.current = null;
    requestVersion.current += 1;
    setNow(null);
    setSelection(null);
    setResult(null);
    setLoading(false);
    if (document.visibilityState === 'visible' && !mutationInFlight.current) void refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const time = readServerTime(clockAnchor.current);
      if (time === null && clockAnchor.current) resyncClock();
      else setNow(time);
    }, 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') needsRefresh.current = true;
      if (needsRefresh.current) resyncClock();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resyncClock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('resume', resyncClock);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('resume', resyncClock);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [resyncClock]);

  const isRestorable = (item: RecycleBinAPI.RecycleBinItem) =>
    item.canRestore && now !== null && now < item.expiresTimeUtc;
  const isExpired = (item: RecycleBinAPI.RecycleBinItem) =>
    now !== null && now >= item.expiresTimeUtc;

  const submit = async () => {
    if (
      !selection ||
      loading ||
      listFailed ||
      mutationInFlight.current ||
      selection.item.resourceType !== query.resourceType
    )
      return;
    const currentTime = readServerTime(clockAnchor.current);
    if (currentTime === null) {
      resyncClock();
      return;
    }
    setNow(currentTime);
    if (
      selection.action === 'restore' &&
      (!canRestore || !selection.item.canRestore || currentTime >= selection.item.expiresTimeUtc)
    )
      return;
    if (selection.action === 'purge' && !canPurge) return;
    mutationInFlight.current = true;
    setSubmitting(true);
    try {
      const action =
        selection.action === 'restore' ? RecycleBinAPI.restoreFn : RecycleBinAPI.purgeFn;
      await action({
        data: {
          resourceType: selection.item.resourceType,
          id: selection.item.id,
          expectedDeletedTimeUtc: selection.item.deletedTimeUtc,
        },
      });
      setSelection(null);
      showSnackbar({ message: t('common.operateSuccess'), type: 'success' });
      needsRefresh.current = true;
    } catch {
      // A conflict or failed request must leave the row and selected deletion version intact.
    } finally {
      mutationInFlight.current = false;
      setSubmitting(false);
    }
    if (needsRefresh.current) await refresh();
  };

  if (permissionLoading) return <CircularProgress aria-label={t('common.loading')} />;
  if (!canRead) return <Alert severity="warning">{t('recycleBin.noReadPermission')}</Alert>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        {t('recycleBin.title')}
      </Typography>
      <Alert severity="info">{t('recycleBin.retentionHelp')}</Alert>
      {resourceLoading && <CircularProgress aria-label={t('common.loading')} />}
      {resourcesFailed && (
        <Alert
          severity="warning"
          action={<Button onClick={() => void loadResources()}>{t('common.refresh')}</Button>}
        >
          {t('recycleBin.resourcesFailed')}
        </Alert>
      )}
      {resources?.length === 0 && (
        <Alert
          severity="info"
          action={<Button onClick={() => void loadResources()}>{t('common.refresh')}</Button>}
        >
          {t('recycleBin.noResources')}
        </Alert>
      )}
      {resource && (
        <>
          <Stack
            component="form"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            onSubmit={(event) => {
              event.preventDefault();
              setQuery((current) => ({ ...current, keyword: keyword.trim(), pageNo: 1 }));
            }}
          >
            <TextField
              select
              size="small"
              label={t('recycleBin.resourceType')}
              value={query.resourceType}
              onChange={(event) => selectResource(event.target.value)}
              disabled={submitting}
              sx={{ minWidth: 180 }}
            >
              {resources?.map((item) => (
                <MenuItem key={item.resourceType} value={item.resourceType}>
                  {t(item.labelKey)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label={t('recycleBin.searchName')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              disabled={submitting}
            />
            <Button type="submit" variant="contained" disabled={loading || submitting}>
              {t('common.search')}
            </Button>
            <Button onClick={() => void refresh()} disabled={loading || submitting}>
              {t('common.refresh')}
            </Button>
            <Button onClick={() => void loadResources()} disabled={loading || submitting}>
              {t('recycleBin.refreshResources')}
            </Button>
          </Stack>
          {listFailed && (
            <Alert
              severity="warning"
              action={<Button onClick={() => void refresh()}>{t('common.refresh')}</Button>}
            >
              {t('recycleBin.listFailed')}
            </Alert>
          )}
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ height: 4 }}>{loading && <LinearProgress />}</Box>
            <TableContainer>
              <Table aria-label={t('recycleBin.title')} sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('column.name')}</TableCell>
                    <TableCell>{t('recycleBin.deletedBy')}</TableCell>
                    <TableCell>{t('recycleBin.deletedTime')}</TableCell>
                    <TableCell>{t('recycleBin.expiresTime')}</TableCell>
                    <TableCell>{t('column.status')}</TableCell>
                    <TableCell align="right">{t('table.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result?.list.map((item) => (
                    <TableRow
                      key={JSON.stringify([item.resourceType, item.id, item.deletedTimeUtc])}
                    >
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        {item.deleterName ?? item.deleterId ?? t('recycleBin.unknownDeleter')}
                      </TableCell>
                      <TableCell>
                        {dayjs(item.deletedTimeUtc).format('YYYY-MM-DD HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {dayjs(item.expiresTimeUtc).format('YYYY-MM-DD HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={isExpired(item) ? 'warning' : 'default'}
                          label={t(isExpired(item) ? 'recycleBin.expired' : 'recycleBin.retained')}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          {canRestore && (
                            <Button
                              size="small"
                              disabled={loading || submitting || !isRestorable(item)}
                              onClick={() => setSelection({ action: 'restore', item })}
                            >
                              {t('recycleBin.restore')}
                            </Button>
                          )}
                          {canPurge && (
                            <Button
                              size="small"
                              color="error"
                              disabled={loading || submitting}
                              onClick={() => setSelection({ action: 'purge', item })}
                            >
                              {t('recycleBin.purge')}
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && !listFailed && result?.list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        {t('column.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {result && (
              <TablePagination
                component="div"
                count={result.total}
                page={result.currentPage - 1}
                rowsPerPage={result.pageSize}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage={t('table.pageSizeLabel')}
                labelDisplayedRows={({ from, to, count }) =>
                  t('recycleBin.pagination', { from, to, count })
                }
                getItemAriaLabel={(type) =>
                  t(type === 'next' ? 'pagination.next' : 'pagination.prev')
                }
                disabled={loading || submitting}
                onPageChange={(_, page) =>
                  setQuery((current) => ({ ...current, pageNo: page + 1 }))
                }
                onRowsPerPageChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    pageNo: 1,
                    pageSize: Number(event.target.value),
                  }))
                }
              />
            )}
          </Paper>
        </>
      )}
      {selection && (
        <Dialog
          open={selection !== null}
          onClose={() => !submitting && setSelection(null)}
          aria-labelledby="recycle-bin-dialog-title"
        >
          <DialogTitle id="recycle-bin-dialog-title">
            {t(selection?.action === 'purge' ? 'recycleBin.purge' : 'recycleBin.restore')}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t(
                selection?.action === 'purge'
                  ? 'recycleBin.purgeConfirm'
                  : 'recycleBin.restoreConfirm',
                { name: selection.item.name, resource: resource ? t(resource.labelKey) : '' },
              )}
            </DialogContentText>
            {selection.action === 'restore' && isExpired(selection.item) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('recycleBin.expired')}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelection(null)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void submit()}
              color={selection?.action === 'purge' ? 'error' : 'primary'}
              variant="contained"
              disabled={
                submitting ||
                (selection?.action === 'restore' &&
                  (!canRestore || !isRestorable(selection.item))) ||
                (selection?.action === 'purge' && !canPurge)
              }
            >
              {t(submitting ? 'common.submitting' : 'common.confirm')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
