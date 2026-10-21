import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import * as AssetAPI from '@/api/enterprise/asset';
import * as TenantAPI from '@/api/enterprise/tenant';
import { PageLayout } from '@/components/Responsive/PageLayout';
import { showSnackbar } from '@/components/Notification';
import { permissions, usePermission } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';
import { AssetDetails } from './AssetDetails';
import {
  DataTable,
  QueryStatus,
  TenantChooser,
  emptyToNull,
  formatTime,
  useRequestScope,
  useScopedMutation,
  useScopedQuery,
  type TenantRow,
} from './shared';

export type AssetRow = Awaited<ReturnType<typeof AssetAPI.getFn>>['data']['data'];
export const categories = ['host', 'disk', 'gpu', 'board', 'sensor', 'meter', 'other'] as const;
type AssetAction = { kind: 'add' } | { kind: 'edit' | 'retire' | 'activate'; row: AssetRow };

export default function AssetPage() {
  const t = useTranslation();
  const { hasAllPermissions, loading } = usePermission();
  if (loading) return <Box sx={{ p: 3 }}>{t('common.loading')}</Box>;
  if (!hasAllPermissions([permissions.enterprise.asset.read, permissions.enterprise.tenant.read]))
    return <Alert severity="warning">{t('assetManagement.noPermission')}</Alert>;
  return <AssetDirectory />;
}

function AssetDirectory() {
  const t = useTranslation();
  const scope = useRequestScope('asset-enterprises');
  const [selected, setSelected] = useState<{ id: number; epoch: number; scopeKey: string } | null>(
    null,
  );
  const directory = useScopedQuery(scope, 'all-memberships', async (requestOptions) => {
    const rows: TenantRow[] = [];
    for (let pageNo = 1; ; pageNo += 1) {
      const data = (
        await TenantAPI.listFn({
          ...requestOptions,
          data: { pageNo, pageSize: 1000, orderBy: 'id', descend: false },
        })
      ).data.data;
      rows.push(...data.list);
      if (pageNo >= data.totalPage) return rows;
    }
  });
  const tenant =
    selected?.scopeKey === scope.key
      ? directory.data?.find((row) => row.id === selected.id)
      : undefined;
  return (
    <PageLayout
      title={t('assetManagement.title')}
      actions={<Button onClick={() => void directory.refresh()}>{t('common.refresh')}</Button>}
    >
      <Stack spacing={2}>
        <Alert severity="info">{t('assetManagement.identityHelp')}</Alert>
        <QueryStatus
          loading={directory.loading}
          failed={directory.failed}
          refresh={directory.refresh}
        />
        {directory.data && (
          <TenantChooser
            tenants={directory.data}
            value={tenant?.id ?? null}
            onChange={(id) =>
              setSelected((value) => ({ id, epoch: (value?.epoch ?? 0) + 1, scopeKey: scope.key }))
            }
          />
        )}
        {directory.data?.length === 0 && (
          <Alert severity="info">{t('assetManagement.noEnterprises')}</Alert>
        )}
        {directory.data && directory.data.length > 0 && !tenant && (
          <Alert severity="info">{t('assetManagement.chooseEnterprise')}</Alert>
        )}
        {tenant &&
          (tenant.frozen || !tenant.isEnabled ? (
            <Alert severity="warning">{t('tenantManagement.frozenHelp')}</Alert>
          ) : (
            <AssetWorkspace key={`${scope.key}:${tenant.id}:${selected?.epoch}`} tenant={tenant} />
          ))}
      </Stack>
    </PageLayout>
  );
}

function AssetWorkspace({ tenant }: { tenant: TenantRow }) {
  const t = useTranslation();
  const { hasAllPermissions } = usePermission();
  const scope = useRequestScope(`asset-workspace:${tenant.id}`);
  const mutation = useScopedMutation(scope);
  const writableRole =
    tenant.memberRole === 'owner' ||
    tenant.memberRole === 'admin' ||
    tenant.memberRole === 'editor';
  const canAdd = writableRole && hasAllPermissions([permissions.enterprise.asset.add]);
  const canEdit = writableRole && hasAllPermissions([permissions.enterprise.asset.edit]);
  const [filters, setFilters] = useState({ keyword: '', category: '', status: '' });
  const [query, setQuery] = useState({ ...filters, pageNo: 1 });
  const [action, setAction] = useState<AssetAction | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'other' as AssetRow['category'],
    assetCode: '',
    brand: '',
    model: '',
    remark: '',
    reason: '',
  });
  const [refreshFailed, setRefreshFailed] = useState(false);
  const list = useScopedQuery(scope, JSON.stringify(query), async (requestOptions) => {
    const category = categories.find((value) => value === query.category);
    const status =
      query.status === 'active' || query.status === 'retired' ? query.status : undefined;
    return (
      await AssetAPI.listFn({
        ...requestOptions,
        data: {
          tenantId: tenant.id,
          pageNo: query.pageNo,
          pageSize: 10,
          keyword: query.keyword,
          category,
          status,
          orderBy: 'id',
          descend: true,
        },
      })
    ).data.data;
  });
  const refresh = async () => {
    const success = await list.refresh();
    if (success !== 'stale') setRefreshFailed(success === 'failed');
    return success;
  };
  const open = (next: AssetAction) => {
    const row = next.kind === 'add' ? null : next.row;
    setForm({
      name: row?.name ?? '',
      category: row?.category ?? 'other',
      assetCode: row?.assetCode ?? '',
      brand: row?.brand ?? '',
      model: row?.model ?? '',
      remark: row?.remark ?? '',
      reason: '',
    });
    setAction(next);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!action) return;
    const selectedAction = action;
    const success = await mutation.run((requestOptions) => {
      const editable = {
        tenantId: tenant.id,
        name: form.name.trim(),
        category: form.category,
        assetCode: emptyToNull(form.assetCode),
        brand: emptyToNull(form.brand),
        model: emptyToNull(form.model),
        remark: emptyToNull(form.remark),
      };
      if (selectedAction.kind === 'add')
        return AssetAPI.addFn({ ...requestOptions, data: editable });
      const version = {
        tenantId: tenant.id,
        id: selectedAction.row.id,
        expectedUpdateTimeUtc: selectedAction.row.updateTimeUtc,
      };
      if (selectedAction.kind === 'edit')
        return AssetAPI.updateFn({ ...requestOptions, data: { ...editable, ...version } });
      return (selectedAction.kind === 'retire' ? AssetAPI.retireFn : AssetAPI.activateFn)({
        ...requestOptions,
        data: { ...version, reason: form.reason.trim() },
      });
    });
    if (!success) return;
    setAction(null);
    showSnackbar({ message: t('common.saveSuccess'), type: 'success' });
    await refresh();
  };
  return (
    <Stack spacing={2}>
      {!writableRole && <Alert severity="info">{t('assetManagement.readOnly')}</Alert>}
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery({ ...filters, keyword: filters.keyword.trim(), pageNo: 1 });
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
          <TextField
            label={t('filter.keyword')}
            size="small"
            value={filters.keyword}
            onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            select
            label={t('assetManagement.category')}
            size="small"
            value={filters.category}
            onChange={(event) =>
              setFilters((value) => ({ ...value, category: event.target.value }))
            }
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {t(`assetManagement.category.${category}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('column.status')}
            size="small"
            value={filters.status}
            onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {['active', 'retired'].map((status) => (
              <MenuItem key={status} value={status}>
                {t(`assetManagement.status.${status}`)}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit">{t('common.search')}</Button>
          <Button onClick={() => void refresh()}>{t('common.refresh')}</Button>
          {canAdd && (
            <Button variant="contained" onClick={() => open({ kind: 'add' })}>
              {t('assetManagement.add')}
            </Button>
          )}
        </Stack>
      </Box>
      {refreshFailed && (
        <Alert
          severity="warning"
          onClose={() => setRefreshFailed(false)}
          action={
            <Button color="inherit" onClick={() => void refresh()}>
              {t('common.refresh')}
            </Button>
          }
        >
          {t('assetManagement.refreshFailed')}
        </Alert>
      )}
      <QueryStatus loading={list.loading} failed={list.failed} refresh={list.refresh} />
      {list.data && (
        <DataTable
          label={t('assetManagement.title')}
          rows={list.data.list}
          page={list.data}
          onPage={(pageNo) => setQuery((value) => ({ ...value, pageNo }))}
          columns={[
            { key: 'id', label: t('column.id'), render: (row) => row.id },
            {
              key: 'name',
              label: t('column.name'),
              render: (row) => <Button onClick={() => setDetail(row.id)}>{row.name}</Button>,
            },
            {
              key: 'code',
              label: t('assetManagement.assetCode'),
              render: (row) => row.assetCode ?? '—',
            },
            {
              key: 'category',
              label: t('assetManagement.category'),
              render: (row) => t(`assetManagement.category.${row.category}`),
            },
            {
              key: 'status',
              label: t('column.status'),
              render: (row) => (
                <Chip
                  size="small"
                  color={row.status === 'active' ? 'success' : 'default'}
                  label={t(`assetManagement.status.${row.status}`)}
                />
              ),
            },
            {
              key: 'updated',
              label: t('column.updateTime'),
              render: (row) => formatTime(row.updateTimeUtc),
            },
          ]}
          actions={(row) => (
            <>
              <Button onClick={() => setDetail(row.id)}>{t('common.view')}</Button>
              {canEdit && (
                <>
                  {row.status === 'active' && (
                    <Button onClick={() => open({ kind: 'edit', row })}>{t('common.edit')}</Button>
                  )}
                  <Button
                    onClick={() =>
                      open({ kind: row.status === 'active' ? 'retire' : 'activate', row })
                    }
                  >
                    {t(
                      row.status === 'active'
                        ? 'assetManagement.retire'
                        : 'assetManagement.activate',
                    )}
                  </Button>
                </>
              )}
            </>
          )}
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
              action?.kind === 'add'
                ? 'assetManagement.add'
                : action?.kind === 'retire'
                  ? 'assetManagement.retire'
                  : action?.kind === 'activate'
                    ? 'assetManagement.activate'
                    : 'common.edit',
            )}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {action?.kind === 'retire' || action?.kind === 'activate' ? (
                <>
                  <Alert severity="warning">
                    {t(
                      action.kind === 'retire'
                        ? 'assetManagement.retireHelp'
                        : 'assetManagement.activateHelp',
                    )}
                  </Alert>
                  <TextField label={t('column.name')} value={action.row.name} disabled />
                  <TextField
                    autoFocus
                    required
                    label={t('assetManagement.reason')}
                    value={form.reason}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, reason: event.target.value }))
                    }
                    multiline
                    minRows={2}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                    disabled={mutation.busy}
                  />
                </>
              ) : (
                <>
                  <TextField
                    autoFocus
                    required
                    label={t('column.name')}
                    value={form.name}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, name: event.target.value }))
                    }
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    disabled={mutation.busy}
                  />
                  <TextField
                    select
                    label={t('assetManagement.category')}
                    value={form.category}
                    onChange={(event) => {
                      const category = categories.find((value) => value === event.target.value);
                      if (category) setForm((value) => ({ ...value, category }));
                    }}
                    disabled={mutation.busy}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {t(`assetManagement.category.${category}`)}
                      </MenuItem>
                    ))}
                  </TextField>
                  {(['assetCode', 'brand', 'model', 'remark'] as const).map((field) => (
                    <TextField
                      key={field}
                      label={t(field === 'remark' ? 'column.remark' : `assetManagement.${field}`)}
                      value={form[field]}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, [field]: event.target.value }))
                      }
                      slotProps={{ htmlInput: { maxLength: field === 'assetCode' ? 100 : 500 } }}
                      disabled={mutation.busy}
                      multiline={field === 'remark'}
                    />
                  ))}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={mutation.busy} onClick={() => setAction(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={mutation.busy} variant="contained">
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      {detail !== null && (
        <AssetDetails
          key={detail}
          tenantId={tenant.id}
          id={detail}
          canEdit={canEdit}
          onClose={() => setDetail(null)}
          onChanged={refresh}
        />
      )}
    </Stack>
  );
}
