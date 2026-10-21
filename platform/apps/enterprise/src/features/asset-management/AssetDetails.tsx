import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import * as AssetAPI from '@/api/enterprise/asset';
import * as MappingAPI from '@/api/enterprise/asset-mapping';
import { showSnackbar } from '@/components/Notification';
import { permissions, usePermission } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';
import {
  DataTable,
  QueryStatus,
  formatTime,
  localNow,
  parseTime,
  useRequestScope,
  useScopedMutation,
  useScopedQuery,
  type QueryRefreshResult,
} from './shared';
import type { AssetRow } from './AssetPage';

type Identifier = Awaited<
  ReturnType<typeof AssetAPI.identifierListFn>
>['data']['data']['list'][number];
type Assignment = Awaited<
  ReturnType<typeof AssetAPI.assignmentListFn>
>['data']['data']['list'][number];
type Binding = Awaited<ReturnType<typeof AssetAPI.bindingListFn>>['data']['data']['list'][number];
type DetailProps = { asset: AssetRow; canEdit: boolean; changed: () => Promise<void> };
const identifierTypes = ['sn', 'wwn', 'gpu_uuid', 'sid', 'other'] as const;
const confidenceLevels = ['high', 'medium', 'low'] as const;
const measurementFields = ['sourceSystem', 'collectorId', 'deviceId', 'metric', 'channel'] as const;

export function AssetDetails({
  tenantId,
  id,
  canEdit,
  onClose,
  onChanged,
}: {
  tenantId: number;
  id: number;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => Promise<QueryRefreshResult>;
}) {
  const t = useTranslation();
  const { hasAllPermissions } = usePermission();
  const scope = useRequestScope(`asset-detail:${tenantId}:${id}`);
  const [tab, setTab] = useState('overview');
  const [refreshFailed, setRefreshFailed] = useState(false);
  const detail = useScopedQuery(
    scope,
    'detail',
    async (requestOptions) =>
      (await AssetAPI.getFn({ ...requestOptions, data: { tenantId, id } })).data.data,
  );
  const changed = async () => {
    const results = await Promise.all([detail.refresh(), onChanged()]);
    if (results.every((result) => result !== 'stale'))
      setRefreshFailed(results.some((result) => result === 'failed'));
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="asset-detail-title">
      <DialogTitle id="asset-detail-title">
        {t('assetManagement.details')}
        {detail.data ? ` · ${detail.data.name}` : ''}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {refreshFailed && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" onClick={() => void changed()}>
                  {t('common.refresh')}
                </Button>
              }
            >
              {t('assetManagement.refreshFailed')}
            </Alert>
          )}
          <QueryStatus loading={detail.loading} failed={detail.failed} refresh={detail.refresh} />
          {detail.data && (
            <>
              {detail.data.status === 'retired' && (
                <Alert severity="info">{t('assetManagement.retiredHelp')}</Alert>
              )}
              <Tabs
                value={tab}
                onChange={(_, value: string) => setTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                aria-label={t('assetManagement.details')}
              >
                {['overview', 'identifiers', 'assignments', 'bindings'].map((value) => (
                  <Tab key={value} value={value} label={t(`assetManagement.${value}`)} />
                ))}
                {hasAllPermissions([permissions.enterprise.asset.mapping.read]) && (
                  <Tab value="resolve" label={t('assetManagement.resolve')} />
                )}
              </Tabs>
              {tab === 'overview' && (
                <Stack spacing={1}>
                  <Typography sx={{ overflowWrap: 'anywhere' }}>
                    {t('assetManagement.assetId')}: {detail.data.assetId}
                  </Typography>
                  <Typography>
                    {t('column.id')}: {detail.data.id}
                  </Typography>
                  <Typography>
                    {t('assetManagement.assetCode')}: {detail.data.assetCode ?? '—'}
                  </Typography>
                  <Typography>
                    {t('assetManagement.category')}:{' '}
                    {t(`assetManagement.category.${detail.data.category}`)}
                  </Typography>
                  <Typography>
                    {t('assetManagement.brand')}: {detail.data.brand ?? '—'} ·{' '}
                    {t('assetManagement.model')}: {detail.data.model ?? '—'}
                  </Typography>
                  <Typography>
                    {t('column.status')}: {t(`assetManagement.status.${detail.data.status}`)}
                  </Typography>
                  <Typography>
                    {t('assetManagement.reason')}: {detail.data.stateReason ?? '—'}
                  </Typography>
                  <Typography>
                    {t('column.remark')}: {detail.data.remark ?? '—'}
                  </Typography>
                  <Typography>
                    {t('column.updateTime')}: {formatTime(detail.data.updateTimeUtc)}
                  </Typography>
                </Stack>
              )}
              {tab === 'identifiers' && (
                <Identifiers
                  asset={detail.data}
                  canEdit={canEdit && detail.data.status === 'active'}
                  changed={changed}
                />
              )}
              {tab === 'assignments' && (
                <Relationships
                  key="assignments"
                  kind="assignment"
                  asset={detail.data}
                  canEdit={canEdit && detail.data.status === 'active'}
                  changed={changed}
                />
              )}
              {tab === 'bindings' && (
                <Relationships
                  key="bindings"
                  kind="binding"
                  asset={detail.data}
                  canEdit={canEdit && detail.data.status === 'active'}
                  changed={changed}
                />
              )}
              {tab === 'resolve' &&
                hasAllPermissions([permissions.enterprise.asset.mapping.read]) && (
                  <MappingResolver tenantId={tenantId} />
                )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void detail.refresh()}>{t('common.refresh')}</Button>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function Identifiers({ asset, canEdit, changed }: DetailProps) {
  const t = useTranslation();
  const scope = useRequestScope(`asset-identifiers:${asset.tenantId}:${asset.id}`);
  const mutation = useScopedMutation(scope);
  const [pageNo, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ row: Identifier | null } | null>(null);
  const [form, setForm] = useState({
    identifierType: 'sn' as Identifier['identifierType'],
    namespace: '',
    value: '',
    source: '',
    confidence: 'medium' as Identifier['confidence'],
    isVerified: false,
  });
  const list = useScopedQuery(
    scope,
    String(pageNo),
    async (requestOptions) =>
      (
        await AssetAPI.identifierListFn({
          ...requestOptions,
          data: {
            tenantId: asset.tenantId,
            assetId: asset.id,
            pageNo,
            pageSize: 10,
            descend: true,
          },
        })
      ).data.data,
  );
  const open = (row: Identifier | null) => {
    setForm({
      identifierType: row?.identifierType ?? 'sn',
      namespace: row?.namespace ?? '',
      value: row?.value ?? '',
      source: row?.source ?? '',
      confidence: row?.confidence ?? 'medium',
      isVerified: row?.isVerified ?? false,
    });
    setDialog({ row });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!dialog) return;
    const row = dialog.row;
    const data = {
      tenantId: asset.tenantId,
      assetId: asset.id,
      expectedAssetUpdateTimeUtc: asset.updateTimeUtc,
      ...form,
      namespace: form.namespace.trim(),
      value: form.value.trim(),
      source: form.source.trim(),
    };
    const success = await mutation.run((requestOptions) =>
      row
        ? AssetAPI.identifierUpdateFn({
            ...requestOptions,
            data: { ...data, id: row.id, expectedUpdateTimeUtc: row.updateTimeUtc },
          })
        : AssetAPI.identifierAddFn({ ...requestOptions, data }),
    );
    if (!success) return;
    setDialog(null);
    showSnackbar({ message: t('common.saveSuccess'), type: 'success' });
    await changed();
  };
  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('assetManagement.identifierHelp')}</Alert>
      {canEdit && (
        <Box>
          <Button onClick={() => open(null)}>{t('assetManagement.addIdentifier')}</Button>
        </Box>
      )}
      <QueryStatus loading={list.loading} failed={list.failed} refresh={list.refresh} />
      {list.data && (
        <DataTable
          label={t('assetManagement.identifiers')}
          rows={list.data.list}
          page={list.data}
          onPage={setPage}
          columns={[
            {
              key: 'type',
              label: t('assetManagement.identifierType'),
              render: (row) => row.identifierType,
            },
            {
              key: 'namespace',
              label: t('assetManagement.namespace'),
              render: (row) => row.namespace || '—',
            },
            {
              key: 'value',
              label: t('assetManagement.identifierValue'),
              render: (row) => row.value,
            },
            {
              key: 'normalized',
              label: t('assetManagement.normalizedValue'),
              render: (row) => row.normalizedValue,
            },
            { key: 'source', label: t('assetManagement.source'), render: (row) => row.source },
            {
              key: 'confidence',
              label: t('assetManagement.confidence'),
              render: (row) => t(`assetManagement.confidence.${row.confidence}`),
            },
            {
              key: 'verified',
              label: t('assetManagement.verified'),
              render: (row) => t(row.isVerified ? 'status.enabled' : 'status.disabled'),
            },
          ]}
          actions={
            canEdit
              ? (row) => <Button onClick={() => open(row)}>{t('common.edit')}</Button>
              : undefined
          }
        />
      )}
      <Dialog
        open={dialog !== null}
        onClose={mutation.busy ? undefined : () => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={save}>
          <DialogTitle>
            {t(dialog?.row ? 'common.edit' : 'assetManagement.addIdentifier')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                select
                label={t('assetManagement.identifierType')}
                value={form.identifierType}
                disabled={mutation.busy}
                onChange={(event) => {
                  const identifierType = identifierTypes.find(
                    (value) => value === event.target.value,
                  );
                  if (identifierType) setForm((value) => ({ ...value, identifierType }));
                }}
              >
                {identifierTypes.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
              {(['namespace', 'value', 'source'] as const).map((field) => (
                <TextField
                  key={field}
                  autoFocus={field === 'value'}
                  required={field !== 'namespace'}
                  label={t(
                    field === 'value'
                      ? 'assetManagement.identifierValue'
                      : `assetManagement.${field}`,
                  )}
                  value={form[field]}
                  disabled={mutation.busy}
                  slotProps={{ htmlInput: { maxLength: field === 'namespace' ? 100 : 250 } }}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, [field]: event.target.value }))
                  }
                />
              ))}
              <TextField
                select
                label={t('assetManagement.confidence')}
                value={form.confidence}
                disabled={mutation.busy}
                onChange={(event) => {
                  const confidence = confidenceLevels.find((value) => value === event.target.value);
                  if (confidence) setForm((value) => ({ ...value, confidence }));
                }}
              >
                {confidenceLevels.map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`assetManagement.confidence.${value}`)}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isVerified}
                    disabled={mutation.busy}
                    onChange={(_, isVerified) => setForm((value) => ({ ...value, isVerified }))}
                  />
                }
                label={t('assetManagement.verified')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={mutation.busy} onClick={() => setDialog(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="contained" type="submit" loading={mutation.busy}>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}

type Relation = Assignment | Binding;
type RelationAction = { mode: 'new' } | { mode: 'replace' | 'close'; row: Relation };
function Relationships({
  kind,
  asset,
  canEdit,
  changed,
}: DetailProps & { kind: 'assignment' | 'binding' }) {
  const t = useTranslation();
  const scope = useRequestScope(`asset-${kind}:${asset.tenantId}:${asset.id}`);
  const mutation = useScopedMutation(scope);
  const [pageNo, setPage] = useState(1);
  const [action, setAction] = useState<RelationAction | null>(null);
  const [form, setForm] = useState({
    hostAssetId: '',
    location: '',
    sourceSystem: '',
    collectorId: '',
    deviceId: '',
    metric: '',
    channel: '',
    validFrom: localNow(),
    validTo: '',
    reason: '',
  });
  const list = useScopedQuery(scope, String(pageNo), async (requestOptions) => {
    const data = {
      tenantId: asset.tenantId,
      assetId: asset.id,
      pageNo,
      pageSize: 10,
      descend: true,
    };
    const result =
      kind === 'assignment'
        ? await AssetAPI.assignmentListFn({ ...requestOptions, data })
        : await AssetAPI.bindingListFn({ ...requestOptions, data });
    return result.data.data;
  });
  const open = (next: RelationAction) => {
    const row = next.mode === 'new' ? null : next.row;
    setForm({
      hostAssetId:
        row && 'hostAssetId' in row && row.hostAssetId !== null ? String(row.hostAssetId) : '',
      location: row && 'location' in row ? row.location : '',
      sourceSystem: row && 'sourceSystem' in row ? row.sourceSystem : '',
      collectorId: row && 'collectorId' in row ? row.collectorId : '',
      deviceId: row && 'deviceId' in row ? row.deviceId : '',
      metric: row && 'metric' in row ? row.metric : '',
      channel: row && 'channel' in row ? row.channel : '',
      validFrom: localNow(),
      validTo: next.mode === 'close' ? localNow() : '',
      reason: '',
    });
    setAction(next);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!action) return;
    const operation = action;
    const parent = {
      tenantId: asset.tenantId,
      assetId: asset.id,
      expectedAssetUpdateTimeUtc: asset.updateTimeUtc,
    };
    const success = await mutation.run((requestOptions) => {
      if (operation.mode === 'close') {
        const data = {
          ...parent,
          id: operation.row.id,
          expectedUpdateTimeUtc: operation.row.updateTimeUtc,
          validToUtc: parseTime(form.validTo),
          reason: form.reason.trim(),
        };
        return kind === 'assignment'
          ? AssetAPI.closeAssignmentFn({ ...requestOptions, data })
          : AssetAPI.closeBindingFn({ ...requestOptions, data });
      }
      const interval = {
        ...parent,
        validFromUtc: parseTime(form.validFrom),
        validToUtc: form.validTo ? parseTime(form.validTo) : null,
        reason: form.reason.trim(),
        ...(operation.mode === 'replace'
          ? { replacesId: operation.row.id, expectedUpdateTimeUtc: operation.row.updateTimeUtc }
          : {}),
      };
      if (kind === 'assignment')
        return AssetAPI.assignFn({
          ...requestOptions,
          data: {
            ...interval,
            hostAssetId: form.hostAssetId ? Number(form.hostAssetId) : null,
            location: form.location.trim(),
          },
        });
      return AssetAPI.bindFn({
        ...requestOptions,
        data: {
          ...interval,
          sourceSystem: form.sourceSystem.trim(),
          collectorId: form.collectorId.trim(),
          deviceId: form.deviceId.trim(),
          metric: form.metric.trim(),
          channel: form.channel.trim(),
        },
      });
    });
    if (!success) return;
    setAction(null);
    showSnackbar({ message: t('common.saveSuccess'), type: 'success' });
    await changed();
  };
  const columns = [
    {
      key: 'target',
      label: t(kind === 'assignment' ? 'assetManagement.location' : 'assetManagement.metric'),
      render: (row: Relation) =>
        'hostAssetId' in row
          ? `${row.location || '—'} (${row.hostAssetId ?? '—'})`
          : `${row.sourceSystem} / ${row.collectorId} / ${row.deviceId} / ${row.metric} / ${row.channel || '—'}`,
    },
    {
      key: 'from',
      label: t('assetManagement.validFrom'),
      render: (row: Relation) => formatTime(row.validFromUtc),
    },
    {
      key: 'to',
      label: t('assetManagement.validTo'),
      render: (row: Relation) =>
        row.validToUtc === null ? t('assetManagement.openEnded') : formatTime(row.validToUtc),
    },
    { key: 'reason', label: t('assetManagement.reason'), render: (row: Relation) => row.reason },
    {
      key: 'close',
      label: t('assetManagement.closeReason'),
      render: (row: Relation) => row.closeReason ?? '—',
    },
  ];
  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('assetManagement.intervalHelp')}</Alert>
      {canEdit && (
        <Box>
          <Button onClick={() => open({ mode: 'new' })}>
            {t(kind === 'assignment' ? 'assetManagement.install' : 'assetManagement.bind')}
          </Button>
        </Box>
      )}
      <QueryStatus loading={list.loading} failed={list.failed} refresh={list.refresh} />
      {list.data && (
        <DataTable<Relation>
          label={t(
            kind === 'assignment' ? 'assetManagement.assignments' : 'assetManagement.bindings',
          )}
          rows={list.data.list}
          columns={columns}
          page={list.data}
          onPage={setPage}
          actions={
            canEdit
              ? (row) =>
                  row.validToUtc === null ? (
                    <>
                      <Button onClick={() => open({ mode: 'replace', row })}>
                        {t('assetManagement.move')}
                      </Button>
                      <Button onClick={() => open({ mode: 'close', row })}>
                        {t('assetManagement.end')}
                      </Button>
                    </>
                  ) : null
              : undefined
          }
        />
      )}
      <Dialog
        open={action !== null}
        onClose={mutation.busy ? undefined : () => setAction(null)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={save}>
          <DialogTitle>
            {t(
              action?.mode === 'close'
                ? 'assetManagement.end'
                : action?.mode === 'replace'
                  ? 'assetManagement.move'
                  : kind === 'assignment'
                    ? 'assetManagement.install'
                    : 'assetManagement.bind',
            )}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {action?.mode === 'replace' && (
                <Alert severity="info">
                  {t('assetManagement.replaces')}: #{action.row.id}
                </Alert>
              )}
              {action?.mode !== 'close' && (
                <>
                  {kind === 'assignment' ? (
                    <>
                      <TextField
                        type="number"
                        label={t('assetManagement.hostAssetId')}
                        helperText={t('assetManagement.hostHelp')}
                        slotProps={{ htmlInput: { min: 1, step: 1 } }}
                        value={form.hostAssetId}
                        disabled={mutation.busy}
                        onChange={(event) =>
                          setForm((value) => ({ ...value, hostAssetId: event.target.value }))
                        }
                      />
                      <TextField
                        label={t('assetManagement.location')}
                        value={form.location}
                        slotProps={{ htmlInput: { maxLength: 250 } }}
                        disabled={mutation.busy}
                        onChange={(event) =>
                          setForm((value) => ({ ...value, location: event.target.value }))
                        }
                      />
                    </>
                  ) : (
                    measurementFields.map((field) => (
                      <TextField
                        key={field}
                        required={field !== 'channel'}
                        label={t(`assetManagement.${field}`)}
                        value={form[field]}
                        disabled={mutation.busy}
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        onChange={(event) =>
                          setForm((value) => ({ ...value, [field]: event.target.value }))
                        }
                      />
                    ))
                  )}
                  <TextField
                    type="datetime-local"
                    required
                    label={t('assetManagement.validFrom')}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { step: 0.001, max: localNow() },
                    }}
                    value={form.validFrom}
                    disabled={mutation.busy}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, validFrom: event.target.value }))
                    }
                  />
                </>
              )}
              <TextField
                type="datetime-local"
                required={action?.mode === 'close'}
                label={t('assetManagement.validTo')}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    step: 0.001,
                    min:
                      action?.mode === 'close'
                        ? dayjs(action.row.validFromUtc + 1).format('YYYY-MM-DDTHH:mm:ss.SSS')
                        : form.validFrom,
                  },
                }}
                value={form.validTo}
                disabled={mutation.busy}
                onChange={(event) =>
                  setForm((value) => ({ ...value, validTo: event.target.value }))
                }
              />
              <TextField
                required
                label={t('assetManagement.reason')}
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: 500 } }}
                value={form.reason}
                disabled={mutation.busy}
                onChange={(event) => setForm((value) => ({ ...value, reason: event.target.value }))}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={mutation.busy} onClick={() => setAction(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="contained" type="submit" loading={mutation.busy}>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}

function MappingResolver({ tenantId }: { tenantId: number }) {
  const t = useTranslation();
  const scope = useRequestScope(`mapping-resolve:${tenantId}`);
  const mutation = useScopedMutation(scope);
  const [form, setForm] = useState({
    sourceSystem: '',
    collectorId: '',
    deviceId: '',
    metric: '',
    channel: '',
    observedTime: localNow(),
  });
  const [result, setResult] = useState<
    Awaited<ReturnType<typeof MappingAPI.resolveFn>>['data']['data'] | null
  >(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setResult(null);
    let resolved: Awaited<ReturnType<typeof MappingAPI.resolveFn>>['data']['data'] | null = null;
    const success = await mutation.run(async (requestOptions) => {
      resolved = (
        await MappingAPI.resolveFn({
          ...requestOptions,
          data: {
            tenantId,
            sourceSystem: form.sourceSystem.trim(),
            collectorId: form.collectorId.trim(),
            deviceId: form.deviceId.trim(),
            metric: form.metric.trim(),
            channel: form.channel.trim(),
            observedTimeUtc: parseTime(form.observedTime),
          },
        })
      ).data.data;
    });
    if (success) setResult(resolved);
  };
  return (
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2}>
        <Alert severity="info">{t('assetManagement.resolveHelp')}</Alert>
        {measurementFields.map((field) => (
          <TextField
            key={field}
            required={field !== 'channel'}
            label={t(`assetManagement.${field}`)}
            value={form[field]}
            disabled={mutation.busy}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            onChange={(event) => {
              setResult(null);
              setForm((value) => ({ ...value, [field]: event.target.value }));
            }}
          />
        ))}
        <TextField
          type="datetime-local"
          required
          label={t('assetManagement.observedTime')}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 0.001 } }}
          value={form.observedTime}
          disabled={mutation.busy}
          onChange={(event) => {
            setResult(null);
            setForm((value) => ({ ...value, observedTime: event.target.value }));
          }}
        />
        <Box>
          <Button type="submit" variant="contained" loading={mutation.busy}>
            {t('assetManagement.resolve')}
          </Button>
        </Box>
        {result && (
          <Alert severity={result.status === 'matched' ? 'success' : 'info'}>
            {result.status === 'matched' && result.mapping
              ? `${t('assetManagement.matched')}: ${result.mapping.assetId}`
              : t('assetManagement.unmapped')}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
