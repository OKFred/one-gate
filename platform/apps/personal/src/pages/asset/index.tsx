import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import * as AssetAPI from '@/api/personal/asset';
import * as TenantAPI from '@/api/enterprise/tenant';
import { classifyApiFailure } from '@/api/config';
import { PageLayout } from '@/components/Responsive/PageLayout';
import { permissions, usePermission } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import { AssetWorkspace, type AssetSnapshot, type SavePlacement } from './AssetWorkspace';
import { createDemoAssets } from './model';
import '../../locales/register';

export { AssetWorkspace } from './AssetWorkspace';
type Tenant = Awaited<ReturnType<typeof TenantAPI.listFn>>['data']['data']['list'][number];

export default function PersonalAssetsPage() {
  const t = useTranslation();
  const { permissionCodes, loading } = usePermission();
  const session = useSyncExternalStore(subscribeAuthChanges, captureAuthSession);
  const [demo, setDemo] = useState(false);
  const readable = [
    permissions.personal.asset.read,
    permissions.enterprise.tenant.read,
    permissions.enterprise.asset.read,
  ].every((code) => permissionCodes.has(code));
  const canPlace = readable && permissionCodes.has(permissions.personal.asset.update);
  if (loading) return <CircularProgress size={24} />;
  if (!readable) return <Alert severity="warning">{t('personal.asset.noPermission')}</Alert>;
  return (
    <PageLayout
      title={t('personal.asset.title')}
      actions={
        <FormControlLabel
          control={<Switch checked={demo} onChange={(_, checked) => setDemo(checked)} />}
          label={t('personal.asset.demo')}
        />
      }
    >
      {demo ? (
        <DemoAssets key={`demo:${session.revision}`} />
      ) : (
        <AssetDirectory key={session.revision} canPlace={canPlace} />
      )}
    </PageLayout>
  );
}

export function DemoAssets() {
  const [snapshot, setSnapshot] = useState<AssetSnapshot>(() => {
    const now = Date.now();
    return { asOfUtc: now, presenceSource: 'demo', assets: createDemoAssets(now) };
  });
  const place: SavePlacement = async (asset, site, floor) => {
    const placement = {
      site,
      floor,
      version: (asset.placement.version ?? 0) + 1,
      updateTimeUtc: Date.now(),
    };
    setSnapshot((value) => ({
      ...value,
      assets: value.assets.map((item) =>
        item.assetId === asset.assetId ? { ...item, placement } : item,
      ),
    }));
    return placement;
  };
  return <AssetWorkspace snapshot={snapshot} demo canPlace onPlace={place} />;
}

function AssetDirectory({ canPlace }: { canPlace: boolean }) {
  const t = useTranslation();
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    const auth = captureAuthSession();
    const current = () => !abort.signal.aborted && isCurrentAuthSession(auth);
    setFailed(false);
    setTenants(null);
    void (async () => {
      const rows: Tenant[] = [];
      for (let pageNo = 1; pageNo <= 100; pageNo += 1) {
        const response = await TenantAPI.listFn({
          data: { pageNo, pageSize: 1000, orderBy: 'id', descend: false },
          signal: abort.signal,
          ignoreAbort: true,
          errorPresentation: 'local',
          shouldPresentError: current,
        });
        if (!current()) return;
        const data = response.data.data;
        if (response.data.ok !== true || !Array.isArray(data.list) || data.totalPage > 100)
          throw new Error('Incomplete enterprise directory');
        rows.push(...data.list);
        if (pageNo >= data.totalPage) {
          setTenants(rows);
          return;
        }
      }
      throw new Error('Incomplete enterprise directory');
    })().catch((failure: unknown) => {
      if (current() && classifyApiFailure(failure).kind !== 'session') setFailed(true);
    });
    return () => abort.abort();
  }, [revision]);
  const usable = tenants?.filter((tenant) => tenant.isEnabled && !tenant.frozen) ?? [];
  const tenant =
    tenants?.find((item) => item.id === selectedId) ??
    (usable.length === 1 ? usable[0] : tenants?.length === 1 ? tenants[0] : null);
  return (
    <Stack spacing={2}>
      {failed ? (
        <Alert
          severity="warning"
          action={
            <Button onClick={() => setRevision((value) => value + 1)}>{t('common.refresh')}</Button>
          }
        >
          {t('personal.asset.tenantLoadFailed')}
        </Alert>
      ) : tenants === null ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {tenants.length === 0 ? (
            <Alert severity="info">{t('personal.asset.noTenant')}</Alert>
          ) : (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              {tenants.length > 1 ? (
                <TextField
                  select
                  size="small"
                  label={t('personal.asset.enterprise')}
                  value={tenant?.id ?? ''}
                  onChange={(event) => setSelectedId(Number(event.target.value))}
                  sx={{ minWidth: { sm: 240 }, maxWidth: { sm: 420 } }}
                >
                  <MenuItem value="" disabled>
                    {t('personal.asset.chooseTenant')}
                  </MenuItem>
                  {tenants.map((item) => (
                    <MenuItem
                      key={item.id}
                      value={item.id}
                      disabled={!item.isEnabled || item.frozen}
                    >
                      {item.name}
                      {!item.isEnabled || item.frozen ? ` · ${t('personal.asset.frozen')}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {tenant?.name}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {t('personal.asset.privatePlacement')}
              </Typography>
            </Stack>
          )}
          {tenant ? (
            tenant.frozen || !tenant.isEnabled ? (
              <Alert severity="warning">{t('personal.asset.frozenHelp')}</Alert>
            ) : (
              <AssetData key={tenant.id} tenantId={tenant.id} canPlace={canPlace} />
            )
          ) : (
            tenants.length > 0 && <Alert severity="info">{t('personal.asset.chooseTenant')}</Alert>
          )}
        </>
      )}
    </Stack>
  );
}

function AssetData({ tenantId, canPlace }: { tenantId: number; canPlace: boolean }) {
  const t = useTranslation();
  const [snapshot, setSnapshot] = useState<AssetSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const writes = useRef<AbortController | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      writes.current?.abort();
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const auth = captureAuthSession();
    const current = () => !abort.signal.aborted && isCurrentAuthSession(auth);
    setFailed(false);
    setSnapshot(null);
    void AssetAPI.overviewFn({
      data: { tenantId },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    }).then(
      (response) => {
        if (!current()) return;
        if (response.data.ok !== true || !Array.isArray(response.data.data?.assets)) {
          setFailed(true);
          return;
        }
        setSnapshot(response.data.data);
      },
      (failure: unknown) => {
        if (current() && classifyApiFailure(failure).kind !== 'session') setFailed(true);
      },
    );
    return () => abort.abort();
  }, [tenantId, revision]);
  const place: SavePlacement = async (asset, site, floor) => {
    const auth = captureAuthSession();
    const abort = new AbortController();
    writes.current = abort;
    const current = () => active.current && isCurrentAuthSession(auth) && !abort.signal.aborted;
    const response = await AssetAPI.placeFn({
      data: {
        tenantId,
        assetId: asset.assetId,
        site,
        floor,
        expectedVersion: asset.placement.version,
      },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    });
    if (!current() || response.data.ok !== true) throw new Error('Placement result unavailable');
    const placement = response.data.data;
    setSnapshot((value) =>
      value
        ? {
            ...value,
            assets: value.assets.map((item) =>
              item.assetId === asset.assetId ? { ...item, placement } : item,
            ),
          }
        : value,
    );
    return placement;
  };
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button
          startIcon={<Refresh />}
          onClick={() => {
            writes.current?.abort();
            setRevision((value) => value + 1);
          }}
        >
          {t('common.refresh')}
        </Button>
      </Stack>
      {failed ? (
        <Alert severity="warning">{t('personal.asset.loadFailed')}</Alert>
      ) : snapshot ? (
        <AssetWorkspace snapshot={snapshot} demo={false} canPlace={canPlace} onPlace={place} />
      ) : (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}
    </Stack>
  );
}
