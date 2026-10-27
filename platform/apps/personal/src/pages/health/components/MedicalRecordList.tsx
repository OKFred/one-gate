import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TablePagination,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Add, MoreHoriz, Refresh, Search, FolderOpen } from '@mui/icons-material';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
} from '@mui/lab';
import * as HealthAPI from '@/api/personal/health';
import { classifyApiFailure } from '@/api/config';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermission } from '@/hooks/usePermission';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import { THIS_PERMISSION } from '../constant';
import {
  categories,
  healthFailure,
  visitDate,
  type MedicalCategory,
  type MedicalRecord,
} from './record-model';
import { MedicalRecordForm } from './MedicalRecordForm';
import { MedicalRecordDetails } from './MedicalRecordDetails';

const columns = { xs: 'minmax(0, 1fr)', lg: '102px 96px minmax(0, 1.15fr) minmax(0, 1fr) 64px' };
type Query = { category: 'all' | MedicalCategory; keyword: string; page: number; pageSize: number };

export function MedicalRecordList() {
  const t = useTranslation();
  const { permissionCodes, loading: permissionsLoading } = usePermission();
  const readable = permissionCodes.has(THIS_PERMISSION.read);
  const addable = readable && permissionCodes.has(THIS_PERMISSION.add);
  const editable = readable && permissionCodes.has(THIS_PERMISSION.edit);
  const deletable = readable && permissionCodes.has(THIS_PERMISSION.delete);
  const [query, setQuery] = useState<Query>({
    category: 'all',
    keyword: '',
    page: 0,
    pageSize: 10,
  });
  const [searchText, setSearchText] = useState('');
  const queryKey = JSON.stringify(query);
  const [data, setData] = useState<{
    queryKey: string;
    list: MedicalRecord[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<{ key: string; record: MedicalRecord | null } | null>(null);
  const [details, setDetails] = useState<MedicalRecord | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; record: MedicalRecord } | null>(null);
  const [deleting, setDeleting] = useState<MedicalRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteUncertain, setDeleteUncertain] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const generation = useRef(0);
  const readController = useRef<AbortController | null>(null);
  const writeController = useRef<AbortController | null>(null);
  const deleteLock = useRef(false);
  const writeSaved = useRef(false);
  const closeForm = useCallback(() => setForm(null), []);
  const refresh = useCallback(() => {
    generation.current += 1;
    readController.current?.abort();
    setRevision((value) => value + 1);
  }, []);
  const saved = useCallback(() => {
    writeSaved.current = true;
    setForm(null);
    setNotice('personal.health.saved');
    refresh();
  }, [refresh]);

  useEffect(() => {
    const requestGeneration = ++generation.current;
    const auth = captureAuthSession();
    const abort = new AbortController();
    readController.current = abort;
    const current = () =>
      requestGeneration === generation.current &&
      isCurrentAuthSession(auth) &&
      !abort.signal.aborted;
    setMenu(null);
    if (!readable) {
      setData(null);
      setForm(null);
      setDetails(null);
      setDeleting(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void HealthAPI.listFn({
      data: {
        keyword: query.keyword || undefined,
        category: query.category === 'all' ? undefined : query.category,
        pageNo: query.page + 1,
        pageSize: query.pageSize,
        orderBy: 'visitDateUtc',
        descend: true,
      },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          const result = response.data.data;
          if (
            response.data.ok !== true ||
            !Array.isArray(result?.list) ||
            typeof result.total !== 'number'
          ) {
            setError(
              writeSaved.current ? 'personal.health.refreshFailed' : 'personal.health.loadFailed',
            );
            return;
          }
          writeSaved.current = false;
          setData({ queryKey, list: result.list, total: result.total });
          if (query.page > Math.max(0, Math.ceil(result.total / query.pageSize) - 1))
            setQuery((previous) => ({
              ...previous,
              page: Math.max(0, Math.ceil(result.total / previous.pageSize) - 1),
            }));
        },
        (failure: unknown) => {
          if (current() && classifyApiFailure(failure).kind !== 'session')
            setError(
              writeSaved.current ? 'personal.health.refreshFailed' : 'personal.health.loadFailed',
            );
        },
      )
      .finally(() => {
        if (current()) setLoading(false);
      });
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(auth)) return;
      generation.current += 1;
      abort.abort();
      writeController.current?.abort();
      setData(null);
      setForm(null);
      setDetails(null);
      setDeleting(null);
      setMenu(null);
      setNotice(null);
      setError(null);
    });
    return () => {
      generation.current += 1;
      abort.abort();
      unsubscribe();
    };
  }, [readable, query, queryKey, revision]);
  useEffect(() => () => writeController.current?.abort(), []);

  const deleteRecord = () => {
    if (!deleting || !deletable || deleteLock.current || deleteUncertain) return;
    const record = deleting;
    const auth = captureAuthSession();
    const abort = new AbortController();
    writeController.current = abort;
    const current = () => isCurrentAuthSession(auth) && !abort.signal.aborted;
    deleteLock.current = true;
    setDeletePending(true);
    setDeleteError(null);
    void HealthAPI.deleteFn({
      data: { id: record.id },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true || response.data.data?.success !== true) {
            setDeleteUncertain(true);
            setDeleteError('personal.health.writeUnknown');
            return;
          }
          setDeleting(null);
          setNotice('personal.health.deleted');
          writeSaved.current = true;
          setData((previous) =>
            previous
              ? {
                  ...previous,
                  list: previous.list.filter((row) => row.id !== record.id),
                  total: previous.total,
                }
              : previous,
          );
          refresh();
        },
        (failure: unknown) => {
          if (!current()) return;
          setDeleteError(healthFailure(failure));
          setDeleteUncertain(classifyApiFailure(failure).kind === 'unknown');
        },
      )
      .finally(() => {
        deleteLock.current = false;
        if (current()) setDeletePending(false);
      });
  };

  const currentData = data?.queryKey === queryKey ? data : null;
  const groups = new Map<string, MedicalRecord[]>();
  for (const row of [...(currentData?.list ?? [])].sort(
    (a, b) => b.visitDateUtc - a.visitDateUtc || b.id - a.id,
  )) {
    const month = dayjs(row.visitDateUtc).format('YYYY-MM');
    groups.set(month, [...(groups.get(month) ?? []), row]);
  }
  const filtered = query.category !== 'all' || !!query.keyword;
  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1.5, sm: 3 }, minWidth: 0, minHeight: { md: 620 } }}
      data-testid="health-records"
    >
      <Stack spacing={2.5}>
        <Stack
          component="form"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          onSubmit={(event) => {
            event.preventDefault();
            setQuery((previous) => ({ ...previous, keyword: searchText.trim(), page: 0 }));
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder={t('personal.health.search')}
            value={searchText}
            disabled={!readable}
            onChange={(event) => setSearchText(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton
                      type="submit"
                      edge="start"
                      aria-label={t('personal.health.searchButton')}
                      disabled={!readable}
                    >
                      <Search />
                    </IconButton>
                  </InputAdornment>
                ),
              },
              htmlInput: {
                'data-testid': 'health-search-input',
                'aria-label': t('personal.health.search'),
                enterKeyHint: 'search',
              },
            }}
            sx={{ '& .MuiInputBase-root': { minHeight: 52, fontSize: 16 } }}
          />
          {addable && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setNotice(null);
                setForm({ key: crypto.randomUUID(), record: null });
              }}
              sx={{ flexShrink: 0, px: 2.5 }}
              data-testid="health-add"
            >
              {t('personal.health.add')}
            </Button>
          )}
        </Stack>
        <Tabs
          value={query.category}
          variant="scrollable"
          scrollButtons="auto"
          aria-label={t('personal.health.category')}
          onChange={(_, value: Query['category']) =>
            setQuery((previous) => ({ ...previous, category: value, page: 0 }))
          }
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 44 }}
        >
          <Tab value="all" label={t('personal.health.all')} data-testid="health-category-all" />
          {categories.map((category) => (
            <Tab
              value={category}
              label={t(`personal.health.category.${category}`)}
              key={category}
              data-testid={`health-category-${category}`}
            />
          ))}
        </Tabs>
        {notice && (
          <Alert severity="success" onClose={() => setNotice(null)}>
            {t(notice)}
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={refresh}>
                {t('personal.health.refresh')}
              </Button>
            }
          >
            {t(error)}
          </Alert>
        )}
        {(loading || permissionsLoading) && (
          <LinearProgress aria-label={t('personal.health.loading')} />
        )}
        {!readable && !permissionsLoading && (
          <Alert severity="info">{t('personal.health.permissionDenied')}</Alert>
        )}
        {readable && (
          <Box aria-busy={loading}>
            <Box
              sx={{
                display: { xs: 'none', lg: 'grid' },
                gridTemplateColumns: columns,
                gap: 2,
                bgcolor: 'action.hover',
                p: 1.5,
                pl: 3.25,
                pr: 0,
                borderRadius: 1,
                color: 'text.secondary',
              }}
            >
              {['date', 'category', 'recordTitle', 'institution'].map((key) => (
                <Typography variant="body1" key={key}>
                  {t(`personal.health.${key}`)}
                </Typography>
              ))}
              <Typography variant="body1" sx={{ textAlign: 'center' }}>
                {t('table.actions')}
              </Typography>
            </Box>
            {groups.size > 0 && (
              <Box
                role="list"
                aria-label={t('personal.health.timeline')}
                data-testid="health-timeline"
              >
                {[...groups].map(([month, rows]) => (
                  <Box key={month} data-testid={`health-month-${month}`} sx={{ mt: 2 }}>
                    <Typography
                      component="h2"
                      variant="subtitle2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {month}
                    </Typography>
                    <Timeline sx={{ m: 0, p: 0 }}>
                      {rows.map((row, index) => (
                        <TimelineItem
                          key={row.id}
                          data-testid={`health-record-${row.id}`}
                          role="listitem"
                          sx={{ '&:before': { display: 'none' } }}
                        >
                          <TimelineSeparator sx={{ width: 14, flexShrink: 0 }}>
                            <TimelineConnector
                              sx={{
                                flex: { xs: '0 0 22px', lg: 1 },
                                bgcolor: 'divider',
                                visibility: index === 0 ? 'hidden' : 'visible',
                              }}
                            />
                            <TimelineDot color="primary" sx={{ m: 0, boxShadow: 'none' }} />
                            <TimelineConnector
                              sx={{
                                bgcolor: 'divider',
                                visibility: index === rows.length - 1 ? 'hidden' : 'visible',
                              }}
                            />
                          </TimelineSeparator>
                          <TimelineContent sx={{ minWidth: 0, py: 0, pl: 1.5, pr: 0 }}>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: columns,
                                alignItems: 'center',
                                columnGap: 2,
                                rowGap: 0.75,
                                py: 2,
                                borderBottom: 1,
                                borderColor: 'divider',
                              }}
                            >
                              <Typography variant="body1" color="text.secondary">
                                {visitDate(row.visitDateUtc)}
                              </Typography>
                              <Box>
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  sx={{ maxWidth: '100%', fontSize: 14 }}
                                  label={t(`personal.health.category.${row.category}`)}
                                />
                              </Box>
                              <Button
                                color="inherit"
                                sx={{
                                  p: 0,
                                  justifyContent: 'flex-start',
                                  textAlign: 'left',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  fontSize: 16,
                                  overflowWrap: 'anywhere',
                                  minWidth: 0,
                                }}
                                onClick={() => setDetails(row)}
                              >
                                {row.title}
                              </Button>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body1" sx={{ overflowWrap: 'anywhere' }}>
                                  {row.hospitalName || t('personal.health.notRecorded')}
                                </Typography>
                                {row.doctorName && (
                                  <Typography variant="caption" color="text.secondary">
                                    {row.doctorName}
                                  </Typography>
                                )}
                              </Box>
                              <IconButton
                                aria-label={t('personal.health.actions', { title: row.title })}
                                data-testid={`health-record-actions-${row.id}`}
                                onClick={(event) =>
                                  setMenu({ anchor: event.currentTarget, record: row })
                                }
                                sx={{ justifySelf: { xs: 'end', lg: 'center' } }}
                              >
                                <MoreHoriz />
                              </IconButton>
                            </Box>
                          </TimelineContent>
                        </TimelineItem>
                      ))}
                    </Timeline>
                  </Box>
                ))}
              </Box>
            )}
            {!loading && !error && currentData && !currentData.list.length && (
              <Stack spacing={1} sx={{ alignItems: 'center', py: 6, textAlign: 'center' }}>
                <FolderOpen sx={{ fontSize: 40, color: 'text.disabled' }} />
                <Typography sx={{ fontWeight: 600 }}>
                  {t(filtered ? 'personal.health.noMatches' : 'personal.health.empty')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('personal.health.emptyHelp')}
                </Typography>
                {filtered && (
                  <Button
                    onClick={() => {
                      setSearchText('');
                      setQuery((previous) => ({
                        ...previous,
                        keyword: '',
                        category: 'all',
                        page: 0,
                      }));
                    }}
                  >
                    {t('personal.health.clearFilters')}
                  </Button>
                )}
              </Stack>
            )}
            {currentData && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  alignItems: { sm: 'center' },
                  justifyContent: 'space-between',
                  borderTop: 1,
                  borderColor: 'divider',
                  mt: 2,
                  pt: 1,
                }}
              >
                <Stack direction="row" sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('personal.health.total', { count: currentData.total })}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={t('personal.health.refresh')}
                    disabled={loading}
                    onClick={refresh}
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                </Stack>
                <TablePagination
                  component="div"
                  count={currentData.total}
                  page={query.page}
                  rowsPerPage={query.pageSize}
                  rowsPerPageOptions={[10, 25, 50]}
                  labelRowsPerPage={t('personal.health.rowsPerPage')}
                  labelDisplayedRows={({ from, to, count }) =>
                    t('personal.health.page', { from, to, count })
                  }
                  getItemAriaLabel={(type) =>
                    t(
                      type === 'previous'
                        ? 'personal.health.previousPage'
                        : 'personal.health.nextPage',
                    )
                  }
                  onPageChange={(_, page) => setQuery((previous) => ({ ...previous, page }))}
                  onRowsPerPageChange={(event) =>
                    setQuery((previous) => ({
                      ...previous,
                      page: 0,
                      pageSize: Number(event.target.value),
                    }))
                  }
                  sx={{
                    '.MuiTablePagination-toolbar': {
                      pl: 0,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    },
                    '.MuiTablePagination-spacer': { display: 'none' },
                    '.MuiTablePagination-selectLabel': { mr: 0.5 },
                    '.MuiTablePagination-actions': { ml: 1 },
                  }}
                />
              </Stack>
            )}
          </Box>
        )}
      </Stack>
      <Menu open={menu !== null} anchorEl={menu?.anchor} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            if (menu) setDetails(menu.record);
            setMenu(null);
          }}
        >
          {t('common.view')}
        </MenuItem>
        {editable && (
          <MenuItem
            onClick={() => {
              if (menu) {
                setNotice(null);
                setForm({ key: crypto.randomUUID(), record: menu.record });
              }
              setMenu(null);
            }}
          >
            {t('common.edit')}
          </MenuItem>
        )}
        {deletable && (
          <MenuItem
            onClick={() => {
              if (menu) {
                setNotice(null);
                setDeleting(menu.record);
                setDeleteUncertain(false);
                setDeleteError(null);
              }
              setMenu(null);
            }}
            sx={{ color: 'error.main' }}
          >
            {t('common.delete')}
          </MenuItem>
        )}
      </Menu>
      {form && (
        <MedicalRecordForm
          key={form.key}
          record={form.record}
          allowed={form.record ? editable : addable}
          onClose={closeForm}
          onSaved={saved}
        />
      )}
      {details && <MedicalRecordDetails record={details} onClose={() => setDetails(null)} />}
      <Dialog
        open={deleting !== null}
        maxWidth="xs"
        fullWidth
        onClose={() => {
          if (!deletePending) setDeleting(null);
        }}
      >
        <DialogTitle>{t('personal.health.delete')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {deleteError && <Alert severity="error">{t(deleteError)}</Alert>}
            <DialogContentText>
              {t('personal.health.deleteQuestion', { title: deleting?.title ?? '' })}
            </DialogContentText>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={deletePending} onClick={() => setDeleting(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            color="error"
            disabled={deletePending || deleteUncertain || !deletable}
            onClick={deleteRecord}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
