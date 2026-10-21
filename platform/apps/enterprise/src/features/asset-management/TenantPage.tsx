import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import * as TenantAPI from '@/api/enterprise/tenant';
import { PageLayout } from '@/components/Responsive/PageLayout';
import { showSnackbar } from '@/components/Notification';
import { permissions, usePermission } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';
import { authUtils } from '@/utils/auth';
import {
  DataTable,
  QueryStatus,
  formatTime,
  useRequestScope,
  useScopedMutation,
  useScopedQuery,
  type QueryRefreshResult,
  type TenantRow,
} from './shared';

type Member = Awaited<ReturnType<typeof TenantAPI.memberListFn>>['data']['data']['list'][number];
type Grant = Awaited<ReturnType<typeof TenantAPI.tokenGrantListFn>>['data']['data']['list'][number];
type TenantAction = { kind: 'create' } | { kind: 'update' | 'recover'; row: TenantRow };
const roles = ['owner', 'admin', 'editor', 'viewer'] as const;

export default function TenantPage() {
  const t = useTranslation();
  const { hasAllPermissions, loading: permissionLoading } = usePermission();
  const canRead = hasAllPermissions([permissions.enterprise.tenant.read]);
  if (permissionLoading) return <Box sx={{ p: 3 }}>{t('common.loading')}</Box>;
  if (!canRead) return <Alert severity="warning">{t('assetManagement.noPermission')}</Alert>;
  return <TenantDirectory />;
}

function TenantDirectory() {
  const t = useTranslation();
  const { hasAllPermissions } = usePermission();
  const canAdd = hasAllPermissions([permissions.enterprise.tenant.add]);
  const canEdit = hasAllPermissions([permissions.enterprise.tenant.edit]);
  const [platform, setPlatform] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState({ pageNo: 1, keyword: '' });
  const [selected, setSelected] = useState<number | null>(null);
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const [action, setAction] = useState<TenantAction | null>(null);
  const [form, setForm] = useState({ key: '', name: '', userId: '', isEnabled: true, reason: '' });
  const scope = useRequestScope(`tenant-directory:${platform}`);
  const mutation = useScopedMutation(scope);
  const directory = useScopedQuery(scope, JSON.stringify(query), async (requestOptions) => {
    const response = await (platform ? TenantAPI.platformListFn : TenantAPI.listFn)({
      ...requestOptions,
      data: { ...query, pageSize: 10, orderBy: 'id', descend: false },
    });
    return response.data.data;
  });
  const current = directory.data?.list.find((row) => row.id === selected);
  const canManagePlatform = directory.data?.canManagePlatform === true;
  useEffect(() => {
    setSelected(null);
    setAction(null);
    setSelectionEpoch((value) => value + 1);
  }, [scope.key]);

  const choose = (tenant: TenantRow) => {
    setSelected(tenant.id);
    setSelectionEpoch((value) => value + 1);
  };
  const open = (next: TenantAction) => {
    setForm({
      key: '',
      name: next.kind === 'create' ? '' : next.row.name,
      userId: '',
      isEnabled: next.kind === 'create' ? true : next.row.isEnabled,
      reason: '',
    });
    setAction(next);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!action) return;
    const selectedAction = action;
    const success = await mutation.run((requestOptions) => {
      if (selectedAction.kind === 'create')
        return TenantAPI.createFn({
          ...requestOptions,
          data: { key: form.key.trim(), name: form.name.trim(), ownerUserId: Number(form.userId) },
        });
      if (selectedAction.kind === 'recover')
        return TenantAPI.recoverOwnerFn({
          ...requestOptions,
          data: {
            tenantId: selectedAction.row.id,
            userId: Number(form.userId),
            expectedUpdateTimeUtc: selectedAction.row.updateTimeUtc,
            reason: form.reason.trim(),
          },
        });
      return TenantAPI.updateFn({
        ...requestOptions,
        data: {
          tenantId: selectedAction.row.id,
          name: form.name.trim(),
          isEnabled: form.isEnabled,
          expectedUpdateTimeUtc: selectedAction.row.updateTimeUtc,
        },
      });
    });
    if (!success) return;
    setAction(null);
    showSnackbar({ message: t('common.saveSuccess'), type: 'success' });
    await directory.refresh();
  };
  return (
    <PageLayout
      title={t('tenantManagement.title')}
      actions={
        <Stack direction="row" spacing={1}>
          <Button onClick={() => void directory.refresh()}>{t('common.refresh')}</Button>
          {(platform || canManagePlatform) && (
            <Button
              onClick={() => {
                setPlatform((value) => !value);
                setQuery({ pageNo: 1, keyword: '' });
                setKeyword('');
                setSelected(null);
                setAction(null);
              }}
            >
              {t(platform ? 'tenantManagement.myEnterprises' : 'tenantManagement.platform')}
            </Button>
          )}
          {platform && canManagePlatform && canAdd && (
            <Button variant="contained" onClick={() => open({ kind: 'create' })}>
              {t('tenantManagement.create')}
            </Button>
          )}
        </Stack>
      }
    >
      <Stack spacing={2}>
        <Alert severity="info">
          {t(platform ? 'tenantManagement.platformHelp' : 'tenantManagement.memberHelp')}
        </Alert>
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            setSelected(null);
            setQuery({ pageNo: 1, keyword: keyword.trim() });
          }}
        >
          <Stack direction="row" spacing={1}>
            <TextField
              label={t('filter.keyword')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              size="small"
            />
            <Button type="submit">{t('common.search')}</Button>
          </Stack>
        </Box>
        <QueryStatus
          loading={directory.loading}
          failed={directory.failed}
          refresh={directory.refresh}
        />
        {directory.data && (
          <DataTable
            label={t('tenantManagement.title')}
            rows={directory.data.list}
            page={directory.data}
            onPage={(pageNo) => {
              setSelected(null);
              setQuery((value) => ({ ...value, pageNo }));
            }}
            columns={[
              {
                key: 'name',
                label: t('column.name'),
                render: (row) => <Button onClick={() => choose(row)}>{row.name}</Button>,
              },
              { key: 'key', label: t('tenantManagement.key'), render: (row) => row.key },
              {
                key: 'role',
                label: t('tenantManagement.role'),
                render: (row) =>
                  row.memberRole ? t(`tenantManagement.role.${row.memberRole}`) : '—',
              },
              {
                key: 'status',
                label: t('column.status'),
                render: (row) => (
                  <Chip
                    size="small"
                    color={row.frozen ? 'warning' : 'success'}
                    label={t(row.frozen ? 'tenantManagement.frozen' : 'status.enabled')}
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
                <Button onClick={() => choose(row)}>{t('common.view')}</Button>
                {platform && canManagePlatform && canEdit && (
                  <>
                    <Button onClick={() => open({ kind: 'update', row })}>
                      {t('common.edit')}
                    </Button>
                    <Button onClick={() => open({ kind: 'recover', row })}>
                      {t('tenantManagement.recoverOwner')}
                    </Button>
                  </>
                )}
              </>
            )}
          />
        )}
        {current && (
          <TenantMembers
            key={`${scope.key}:${current.id}:${selectionEpoch}`}
            tenant={current}
            onChanged={directory.refresh}
          />
        )}
      </Stack>
      <Dialog
        open={action !== null}
        onClose={mutation.busy ? undefined : () => setAction(null)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={save}>
          <DialogTitle>
            {t(
              action?.kind === 'create'
                ? 'tenantManagement.create'
                : action?.kind === 'recover'
                  ? 'tenantManagement.recoverOwner'
                  : 'common.edit',
            )}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {action?.kind === 'create' && (
                <TextField
                  autoFocus
                  label={t('tenantManagement.key')}
                  required
                  slotProps={{ htmlInput: { pattern: '[a-z0-9][a-z0-9_-]{1,63}', maxLength: 64 } }}
                  value={form.key}
                  onChange={(event) => setForm((value) => ({ ...value, key: event.target.value }))}
                  disabled={mutation.busy}
                />
              )}
              {action?.kind !== 'recover' && (
                <TextField
                  label={t('column.name')}
                  required
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                  value={form.name}
                  onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                  disabled={mutation.busy}
                />
              )}
              {action?.kind === 'update' && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isEnabled}
                      disabled={mutation.busy}
                      onChange={(_, isEnabled) => setForm((value) => ({ ...value, isEnabled }))}
                    />
                  }
                  label={t('common.isEnabled')}
                />
              )}
              {action?.kind !== 'update' && (
                <TextField
                  label={t('tenantManagement.ownerUserId')}
                  type="number"
                  required
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  value={form.userId}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, userId: event.target.value }))
                  }
                  disabled={mutation.busy}
                />
              )}
              {action?.kind === 'recover' && (
                <>
                  <Alert severity="warning">{t('tenantManagement.recoverHelp')}</Alert>
                  <TextField
                    label={t('assetManagement.reason')}
                    required
                    multiline
                    minRows={2}
                    value={form.reason}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, reason: event.target.value }))
                    }
                    disabled={mutation.busy}
                  />
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
    </PageLayout>
  );
}

function TenantMembers({
  tenant,
  onChanged,
}: {
  tenant: TenantRow;
  onChanged: () => Promise<QueryRefreshResult>;
}) {
  const t = useTranslation();
  const { hasAllPermissions } = usePermission();
  const canManage =
    !tenant.frozen &&
    hasAllPermissions([permissions.enterprise.tenant.edit]) &&
    (tenant.memberRole === 'owner' || tenant.memberRole === 'admin');
  if (!canManage)
    return (
      <Alert severity={tenant.frozen ? 'warning' : 'info'}>
        {t(tenant.frozen ? 'tenantManagement.frozenHelp' : 'tenantManagement.readOnlyMembers')}
      </Alert>
    );
  return <TenantMembersContent tenant={tenant} onChanged={onChanged} />;
}

function TenantMembersContent({
  tenant,
  onChanged,
}: {
  tenant: TenantRow;
  onChanged: () => Promise<QueryRefreshResult>;
}) {
  const t = useTranslation();
  const scope = useRequestScope(`tenant-members:${tenant.id}`);
  const mutation = useScopedMutation(scope);
  const [memberPage, setMemberPage] = useState(1);
  const [grantPage, setGrantPage] = useState(1);
  const [dialog, setDialog] = useState<'member' | 'grant' | 'transfer' | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [grant, setGrant] = useState<Grant | null>(null);
  const [form, setForm] = useState({
    userId: '',
    role: 'viewer' as Member['role'],
    isEnabled: true,
    tokenId: '',
    toUserId: '',
  });
  const members = useScopedQuery(
    scope,
    `members:${memberPage}`,
    async (requestOptions) =>
      (
        await TenantAPI.memberListFn({
          ...requestOptions,
          data: { tenantId: tenant.id, pageNo: memberPage, pageSize: 20 },
        })
      ).data.data,
  );
  const grants = useScopedQuery(
    scope,
    `grants:${grantPage}`,
    async (requestOptions) =>
      (
        await TenantAPI.tokenGrantListFn({
          ...requestOptions,
          data: { tenantId: tenant.id, pageNo: grantPage, pageSize: 20 },
        })
      ).data.data,
  );
  const transferMembers = useScopedQuery(
    scope,
    `transfer:${dialog === 'transfer'}`,
    async (requestOptions) => {
      const rows: Member[] = [];
      if (dialog !== 'transfer') return rows;
      for (let pageNo = 1; ; pageNo += 1) {
        const data = (
          await TenantAPI.memberListFn({
            ...requestOptions,
            data: { tenantId: tenant.id, pageNo, pageSize: 1000 },
          })
        ).data.data;
        rows.push(...data.list);
        if (pageNo >= data.totalPage) return rows;
      }
    },
  );
  const myId = authUtils.getUserInfo()?.id;
  const sourceOwner = transferMembers.data?.find(
    (value) => value.userId === myId && value.role === 'owner' && value.isEnabled,
  );
  const openMember = (row: Member | null) => {
    setMember(row);
    setForm({
      userId: row ? String(row.userId) : '',
      role: row?.role ?? 'viewer',
      isEnabled: row?.isEnabled ?? true,
      tokenId: '',
      toUserId: '',
    });
    setDialog('member');
  };
  const openGrant = (row: Grant | null) => {
    setGrant(row);
    setForm({
      userId: '',
      role: 'viewer',
      isEnabled: row?.isEnabled ?? true,
      tokenId: row ? String(row.tokenId) : '',
      toUserId: '',
    });
    setDialog('grant');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const mode = dialog;
    const target = transferMembers.data?.find((row) => String(row.userId) === form.toUserId);
    if (mode === 'transfer' && (!sourceOwner || !target)) return;
    const success = await mutation.run((requestOptions) => {
      if (mode === 'member')
        return TenantAPI.memberSetFn({
          ...requestOptions,
          data: {
            tenantId: tenant.id,
            userId: Number(form.userId),
            role: form.role,
            isEnabled: form.isEnabled,
            expectedUpdateTimeUtc: member?.updateTimeUtc ?? null,
          },
        });
      if (mode === 'grant')
        return TenantAPI.tokenGrantSetFn({
          ...requestOptions,
          data: {
            tenantId: tenant.id,
            tokenId: Number(form.tokenId),
            isEnabled: form.isEnabled,
            expectedUpdateTimeUtc: grant?.updateTimeUtc ?? null,
          },
        });
      if (mode === 'transfer' && sourceOwner && target)
        return TenantAPI.transferOwnerFn({
          ...requestOptions,
          data: {
            tenantId: tenant.id,
            toUserId: target.userId,
            expectedSourceTimeUtc: sourceOwner.updateTimeUtc,
            expectedTargetTimeUtc: target.updateTimeUtc,
          },
        });
      return Promise.reject(new Error('No selected tenant operation'));
    });
    if (!success) return;
    setDialog(null);
    showSnackbar({ message: t('common.saveSuccess'), type: 'success' });
    await onChanged();
  };
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {tenant.name} · {t('tenantManagement.members')}
        </Typography>
        <Button onClick={() => openMember(null)}>{t('tenantManagement.addMember')}</Button>
        {tenant.memberRole === 'owner' && (
          <Button
            onClick={() => {
              setForm((value) => ({ ...value, toUserId: '' }));
              setDialog('transfer');
            }}
          >
            {t('tenantManagement.transferOwner')}
          </Button>
        )}
      </Stack>
      <QueryStatus loading={members.loading} failed={members.failed} refresh={members.refresh} />
      {members.data && (
        <DataTable
          label={t('tenantManagement.members')}
          rows={members.data.list}
          page={members.data}
          onPage={setMemberPage}
          columns={[
            {
              key: 'user',
              label: t('tenantManagement.user'),
              render: (row) => `${row.username ?? '—'} (#${row.userId})`,
            },
            {
              key: 'role',
              label: t('tenantManagement.role'),
              render: (row) => t(`tenantManagement.role.${row.role}`),
            },
            {
              key: 'status',
              label: t('column.status'),
              render: (row) =>
                t(row.isEnabled && row.userIsEnabled ? 'status.enabled' : 'status.disabled'),
            },
          ]}
          actions={(row) =>
            tenant.memberRole === 'owner' || (row.role !== 'owner' && row.userId !== myId) ? (
              <Button onClick={() => openMember(row)}>{t('common.edit')}</Button>
            ) : null
          }
        />
      )}
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {t('tenantManagement.tokens')}
        </Typography>
        <Button onClick={() => openGrant(null)}>{t('tenantManagement.addGrant')}</Button>
      </Stack>
      <Alert severity="info">{t('tenantManagement.tokenHelp')}</Alert>
      <QueryStatus loading={grants.loading} failed={grants.failed} refresh={grants.refresh} />
      {grants.data && (
        <DataTable
          label={t('tenantManagement.tokens')}
          rows={grants.data.list}
          page={grants.data}
          onPage={setGrantPage}
          columns={[
            { key: 'token', label: t('tenantManagement.tokenId'), render: (row) => row.tokenId },
            {
              key: 'status',
              label: t('column.status'),
              render: (row) => t(row.isEnabled ? 'status.enabled' : 'status.disabled'),
            },
            {
              key: 'updated',
              label: t('column.updateTime'),
              render: (row) => formatTime(row.updateTimeUtc),
            },
          ]}
          actions={(row) => <Button onClick={() => openGrant(row)}>{t('common.edit')}</Button>}
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
            {t(
              dialog === 'member'
                ? 'tenantManagement.members'
                : dialog === 'grant'
                  ? 'tenantManagement.tokens'
                  : 'tenantManagement.transferOwner',
            )}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {dialog === 'member' && (
                <>
                  <TextField
                    autoFocus
                    required
                    type="number"
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                    label={t('tenantManagement.userId')}
                    value={form.userId}
                    disabled={mutation.busy || member !== null}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, userId: event.target.value }))
                    }
                  />
                  <TextField
                    select
                    label={t('tenantManagement.role')}
                    value={form.role}
                    disabled={mutation.busy}
                    onChange={(event) => {
                      const role = roles.find((value) => value === event.target.value);
                      if (role) setForm((value) => ({ ...value, role }));
                    }}
                  >
                    {roles
                      .filter((role) => tenant.memberRole === 'owner' || role !== 'owner')
                      .map((role) => (
                        <MenuItem key={role} value={role}>
                          {t(`tenantManagement.role.${role}`)}
                        </MenuItem>
                      ))}
                  </TextField>
                </>
              )}
              {dialog === 'grant' && (
                <TextField
                  autoFocus
                  required
                  type="number"
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  label={t('tenantManagement.tokenId')}
                  value={form.tokenId}
                  disabled={mutation.busy || grant !== null}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, tokenId: event.target.value }))
                  }
                />
              )}
              {dialog === 'transfer' ? (
                <>
                  <Alert severity="warning">{t('tenantManagement.transferHelp')}</Alert>
                  <QueryStatus
                    loading={transferMembers.loading}
                    failed={transferMembers.failed}
                    refresh={transferMembers.refresh}
                  />
                  <TextField
                    select
                    required
                    label={t('tenantManagement.newOwner')}
                    value={form.toUserId}
                    disabled={mutation.busy || !sourceOwner}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, toUserId: event.target.value }))
                    }
                  >
                    {transferMembers.data
                      ?.filter((row) => row.userId !== myId && row.isEnabled && row.userIsEnabled)
                      .map((row) => (
                        <MenuItem key={row.id} value={String(row.userId)}>
                          {row.username} (#{row.userId})
                        </MenuItem>
                      ))}
                  </TextField>
                  {transferMembers.data &&
                    transferMembers.data.filter(
                      (row) => row.userId !== myId && row.isEnabled && row.userIsEnabled,
                    ).length === 0 && (
                      <Alert severity="info">{t('tenantManagement.transferUnavailable')}</Alert>
                    )}
                </>
              ) : (
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isEnabled}
                      disabled={
                        mutation.busy ||
                        (dialog === 'grant' &&
                          grant !== null &&
                          grant.creatorId !== myId &&
                          !grant.isEnabled)
                      }
                      onChange={(_, isEnabled) => setForm((value) => ({ ...value, isEnabled }))}
                    />
                  }
                  label={t('common.isEnabled')}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={mutation.busy} onClick={() => setDialog(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              loading={mutation.busy}
              disabled={dialog === 'transfer' && (!sourceOwner || !form.toUserId)}
            >
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
