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

export default function RecycleBinPage() {
  const t = useTranslation();
  const { hasAllPermissions, loading: permissionLoading } = usePermission();
  const canRead = hasAllPermissions([
    permissions.admin.maintenance.recycle_bin.read,
    permissions.admin.system.department.read,
  ]);
  const canRestore = hasAllPermissions([
    permissions.admin.maintenance.recycle_bin.restore,
    permissions.admin.system.department.edit,
  ]);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState({ keyword: '', pageNo: 1, pageSize: 10 });
  const [result, setResult] = useState<RecycleBinAPI.ListRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now);
  const requestVersion = useRef(0);
  const mutationInFlight = useRef(false);
  const canPurge = result?.canPurge === true;

  const refresh = useCallback(async () => {
    if (permissionLoading || !canRead) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await RecycleBinAPI.listFn({
        data: { resourceType: 'department', ...query },
      });
      if (version === requestVersion.current) {
        const data = response.data.data;
        const lastPage = Math.max(1, data.totalPage);
        if (query.pageNo > lastPage) {
          setQuery((current) => ({ ...current, pageNo: lastPage }));
        } else {
          setResult(data);
          setNow(Date.now());
        }
      }
    } catch {
      // The shared HTTP adapter displays the server error and keeps the current rows intact.
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [canRead, permissionLoading, query]);

  useEffect(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isRestorable = (item: RecycleBinAPI.RecycleBinItem) =>
    item.canRestore && now < item.expiresTimeUtc;

  const submit = async () => {
    if (!selection || mutationInFlight.current) return;
    if (selection.action === 'restore' && (!canRestore || !isRestorable(selection.item))) return;
    if (selection.action === 'purge' && !canPurge) return;
    mutationInFlight.current = true;
    setSubmitting(true);
    try {
      const action =
        selection.action === 'restore' ? RecycleBinAPI.restoreFn : RecycleBinAPI.purgeFn;
      await action({
        data: {
          resourceType: 'department',
          id: selection.item.id,
          expectedDeletedTimeUtc: selection.item.deletedTimeUtc,
        },
      });
      setSelection(null);
      showSnackbar({ message: t('common.operateSuccess'), type: 'success' });
      await refresh();
    } catch {
      // A conflict or failed request must leave the row and selected deletion version intact.
    } finally {
      mutationInFlight.current = false;
      setSubmitting(false);
    }
  };

  if (permissionLoading) return <CircularProgress aria-label={t('common.loading')} />;
  if (!canRead) return <Alert severity="warning">{t('recycleBin.noReadPermission')}</Alert>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        {t('recycleBin.title')}
      </Typography>
      <Alert severity="info">{t('recycleBin.retentionHelp')}</Alert>
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
      </Stack>
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
                <TableRow key={`${item.id}:${item.deletedTimeUtc}`}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.deleterName ?? item.deleterId ?? t('recycleBin.unknownDeleter')}
                  </TableCell>
                  <TableCell>{dayjs(item.deletedTimeUtc).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  <TableCell>{dayjs(item.expiresTimeUtc).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={isRestorable(item) ? 'default' : 'warning'}
                      label={t(isRestorable(item) ? 'recycleBin.retained' : 'recycleBin.expired')}
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
              {!loading && !result?.list.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t('column.noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={result?.total ?? 0}
          page={query.pageNo - 1}
          rowsPerPage={query.pageSize}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage={t('table.pageSizeLabel')}
          labelDisplayedRows={({ from, to, count }) =>
            t('recycleBin.pagination', { from, to, count })
          }
          getItemAriaLabel={(type) => t(type === 'next' ? 'pagination.next' : 'pagination.prev')}
          disabled={loading || submitting}
          onPageChange={(_, page) => setQuery((current) => ({ ...current, pageNo: page + 1 }))}
          onRowsPerPageChange={(event) =>
            setQuery((current) => ({ ...current, pageNo: 1, pageSize: Number(event.target.value) }))
          }
        />
      </Paper>
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
                { name: selection?.item.name ?? '' },
              )}
            </DialogContentText>
            {selection?.action === 'restore' && !isRestorable(selection.item) && (
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
