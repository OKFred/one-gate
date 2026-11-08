import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TablePagination,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  AccountTreeOutlined,
  ArrowForward,
  Close,
  LocationOnOutlined,
  Search,
  ViewInArOutlined,
  ViewListOutlined,
} from '@mui/icons-material';
import { classifyApiFailure } from '@/api/config';
import type { AssetPlacement } from '@/api/personal/asset';
import { useTranslation } from '@/hooks/useTranslation';
import { AssetTopology } from './AssetTopology';
import { AssetIcon, AssetSpacesScene, StatusChip } from './HouseScene';
import {
  effectivePresence,
  presenceStatuses,
  sites,
  statusColors,
  type AssetView,
  type Site,
} from './model';

export type AssetSnapshot = {
  asOfUtc: number;
  presenceSource: 'unconfigured' | 'demo';
  assets: AssetView[];
};
export type SavePlacement = (
  asset: AssetView,
  site: Site | null,
  floor: AssetPlacement['floor'],
) => Promise<AssetPlacement>;
const time = (value: number | null) =>
  value === null ? '—' : dayjs(value).format('YYYY-MM-DD HH:mm:ss');

export function AssetWorkspace({
  snapshot,
  demo,
  canPlace,
  onPlace,
}: {
  snapshot: AssetSnapshot;
  demo: boolean;
  canPlace: boolean;
  onPlace: SavePlacement;
}) {
  const t = useTranslation();
  const [view, setView] = useState<'list' | 'topology' | 'space'>('list');
  const focusList = useRef(false);
  const [floors, setFloors] = useState({ OpenLife: 1, OpenMind: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState(false);
  const [, tick] = useState(0);
  const clock = useMemo(
    () => ({ server: snapshot.asOfUtc, received: performance.now() }),
    [snapshot.asOfUtc],
  );
  const now = clock.server + Math.max(0, performance.now() - clock.received);
  useEffect(() => {
    if (view !== 'list' || !focusList.current) return;
    focusList.current = false;
    const list = document.getElementById('personal-asset-list');
    list?.focus({ preventScroll: true });
    list?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [view]);
  useEffect(() => {
    const update = () => tick((value) => value + 1);
    const currentTime = clock.server + Math.max(0, performance.now() - clock.received);
    const nextExpiry = Math.min(
      ...snapshot.assets
        .filter((asset) => asset.presence.status !== 'unknown')
        .map((asset) => asset.presence.expiresTimeUtc)
        .filter((expiry): expiry is number => expiry !== null && expiry > now),
    );
    const timer = Number.isFinite(nextExpiry)
      ? window.setTimeout(
          update,
          Math.min(2_147_483_647, Math.max(1, Math.ceil(nextExpiry - currentTime))),
        )
      : undefined;
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [snapshot.assets, clock, now]);
  const physical = useMemo(
    () => snapshot.assets.filter((asset) => !asset.demoKind),
    [snapshot.assets],
  );
  const selected = snapshot.assets.find((asset) => asset.assetId === selectedId) ?? null;
  const pending = physical.filter(
    (asset) => asset.placement.site === null || asset.placement.floor === null,
  );
  const filtered = physical.filter((asset) => {
    const placement = asset.placement;
    return (
      asset.name.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase()) &&
      (siteFilter === 'all' ||
        (siteFilter === 'pending'
          ? placement.site === null || placement.floor === null
          : placement.site === siteFilter)) &&
      (!floorFilter || placement.floor === floorFilter) &&
      (statusFilter === 'all' || effectivePresence(asset, now).status === statusFilter)
    );
  });
  const pageCount = 10;
  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageCount) - 1));
  const select = (id: string) => {
    const asset = snapshot.assets.find((item) => item.assetId === id);
    const physicalAsset = asset?.demoKind
      ? snapshot.assets.find((item) => item.assetId === asset.hostAssetId)
      : asset;
    if (physicalAsset) {
      const { site, floor } = physicalAsset.placement;
      if (site && floor) setFloors((value) => ({ ...value, [site]: floor }));
    }
    setSelectedId(id);
  };
  const showFloor = (site: Site) => {
    setSiteFilter(site);
    setFloorFilter(floors[site]);
    setPage(0);
    focusList.current = true;
    setView('list');
  };
  return (
    <Stack spacing={2.5}>
      {demo ? (
        <Alert severity="info">{t('personal.asset.demoHelp')}</Alert>
      ) : (
        <Alert severity="info">{t('personal.asset.unconfigured')}</Alert>
      )}
      {notice && (
        <Alert severity="success" onClose={() => setNotice(false)}>
          {t(demo ? 'personal.asset.demoSaved' : 'personal.asset.saved')}
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          aria-label={t('personal.asset.viewMode')}
          onChange={(_, next: unknown) => {
            if (next === 'list' || next === 'topology' || next === 'space') setView(next);
          }}
        >
          <ToggleButton value="list" sx={{ gap: 0.75, minHeight: 44 }}>
            <ViewListOutlined fontSize="small" />
            {t('personal.asset.listView')}
          </ToggleButton>
          <ToggleButton value="topology" sx={{ gap: 0.75, minHeight: 44 }}>
            <AccountTreeOutlined fontSize="small" />
            {t('personal.asset.topologyView')}
          </ToggleButton>
          <ToggleButton value="space" sx={{ gap: 0.75, minHeight: 44 }}>
            <ViewInArOutlined fontSize="small" />
            {t('personal.asset.spaceView')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {view === 'topology' && (
        <AssetTopology
          assets={physical}
          selectedId={selected?.demoKind ? selected.hostAssetId : selectedId}
          now={now}
          onSelect={select}
        />
      )}
      {view === 'space' && (
        <AssetSpacesScene
          floors={floors}
          assets={physical}
          selectedId={selected?.demoKind ? selected.hostAssetId : selectedId}
          now={now}
          onFloorChange={(site, floor) => setFloors((value) => ({ ...value, [site]: floor }))}
          onSelect={select}
          onShowFloor={showFloor}
        />
      )}
      <Paper
        id="personal-asset-list"
        tabIndex={-1}
        variant="outlined"
        sx={{
          display: view === 'list' ? 'block' : 'none',
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: 3,
          scrollMarginTop: 96,
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}
        >
          <Typography component="h2" variant="h6">
            {t('personal.asset.list')}{' '}
            <Typography component="span" variant="body2" color="text.secondary">
              {physical.length}
            </Typography>
          </Typography>
          <Chip
            icon={<LocationOnOutlined />}
            variant="outlined"
            label={t('personal.asset.pendingCount', { count: pending.length })}
            onClick={() => {
              setSiteFilter('pending');
              setFloorFilter(0);
              setPage(0);
            }}
            sx={{ minHeight: 44 }}
          />
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: '2fr 1fr 1fr' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <TextField
            size="small"
            label={t('personal.asset.search')}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label={t('personal.asset.location')}
            value={siteFilter}
            onChange={(event) => {
              setSiteFilter(event.target.value);
              setFloorFilter(0);
              setPage(0);
            }}
          >
            <MenuItem value="all">{t('personal.asset.allLocations')}</MenuItem>
            <MenuItem value="pending">{t('personal.asset.pending')}</MenuItem>
            {sites.map((site) => (
              <MenuItem key={site} value={site}>
                {site}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('personal.asset.presence')}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="all">{t('personal.asset.allStatuses')}</MenuItem>
            {presenceStatuses.map((status) => (
              <MenuItem key={status} value={status}>
                {t(`personal.asset.status.${status}`)}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {floorFilter > 0 && (
          <Chip
            onDelete={() => setFloorFilter(0)}
            label={`${siteFilter} · ${floorFilter}F`}
            sx={{ mb: 1.5 }}
          />
        )}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}
          aria-label={t('personal.asset.legend')}
        >
          {presenceStatuses.map((status) => (
            <Chip
              key={status}
              size="small"
              variant="outlined"
              color={statusColors[status]}
              label={t(`personal.asset.status.${status}`)}
            />
          ))}
        </Stack>
        {filtered.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {t(physical.length === 0 ? 'personal.asset.empty' : 'personal.asset.noMatches')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(physical.length === 0 ? 'personal.asset.emptyHelp' : 'personal.asset.filterHelp')}
            </Typography>
          </Box>
        )}
        {filtered.slice(safePage * pageCount, (safePage + 1) * pageCount).map((asset) => (
          <ButtonBase
            key={asset.assetId}
            onClick={() => select(asset.assetId)}
            aria-label={t('personal.asset.viewAsset', { name: asset.name })}
            sx={{
              width: '100%',
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: {
                xs: '32px minmax(0,1fr) 22px',
                sm: '32px minmax(0,1.5fr) minmax(110px,.8fr) minmax(120px,1fr) 22px',
              },
              gap: 1.5,
              alignItems: 'center',
              py: 1.75,
              px: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: selectedId === asset.assetId ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
              '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
            }}
          >
            <Box sx={{ color: 'text.secondary' }}>
              <AssetIcon category={asset.category} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                {asset.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t(`personal.asset.category.${asset.category}`)}
                {asset.inventoryStatus === 'retired' ? ` · ${t('personal.asset.retired')}` : ''}
              </Typography>
              <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>
                <StatusChip asset={asset} now={now} />
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ ml: 1 }}
                  color="text.secondary"
                >
                  {asset.placement.site
                    ? `${asset.placement.site} · ${asset.placement.floor ?? '—'}F`
                    : t('personal.asset.pending')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2">
                {asset.placement.site ?? t('personal.asset.pending')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {asset.placement.floor ? `${asset.placement.floor}F` : '—'}
              </Typography>
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <StatusChip asset={asset} now={now} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {t('personal.asset.heartbeatShort')}: {time(asset.presence.lastHeartbeatTimeUtc)}
              </Typography>
            </Box>
            <ArrowForward fontSize="small" color="action" />
          </ButtonBase>
        ))}
        {filtered.length > pageCount && (
          <TablePagination
            component="div"
            count={filtered.length}
            page={safePage}
            onPageChange={(_, value) => setPage(value)}
            rowsPerPage={pageCount}
            rowsPerPageOptions={[pageCount]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
          />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {t('personal.asset.snapshotTime')}: {time(snapshot.asOfUtc)}
        </Typography>
      </Paper>
      <Drawer
        anchor="right"
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
      >
        {selected && (
          <Box
            sx={{ width: { xs: 'min(100vw, 440px)', sm: 440 }, p: { xs: 2, sm: 3 } }}
            role="dialog"
            aria-label={t('personal.asset.details')}
          >
            <Stack
              direction="row"
              sx={{ alignItems: 'start', justifyContent: 'space-between', gap: 1, mb: 2 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary">
                  {t('personal.asset.details')}
                </Typography>
                <Typography component="h2" variant="h6" sx={{ overflowWrap: 'anywhere' }}>
                  {selected.name}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setSelectedId(null)}
                aria-label={t('common.close')}
                sx={{ minHeight: 44, minWidth: 44 }}
              >
                <Close />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <StatusChip asset={selected} now={now} />
              {selected.inventoryStatus === 'retired' && (
                <Chip size="small" label={t('personal.asset.retired')} />
              )}
            </Stack>
            <Box
              component="dl"
              sx={{
                m: 0,
                display: 'grid',
                gridTemplateColumns: '110px minmax(0,1fr)',
                gap: 1.5,
                '& dt': { color: 'text.secondary', fontSize: 13 },
                '& dd': { m: 0, fontSize: 13, overflowWrap: 'anywhere' },
              }}
            >
              <dt>{t('personal.asset.identity')}</dt>
              <dd>{selected.assetId}</dd>
              <dt>{t('personal.asset.basis')}</dt>
              <dd>{t(`personal.asset.basis.${effectivePresence(selected, now).basis}`)}</dd>
              <dt>{t('personal.asset.heartbeat')}</dt>
              <dd>{time(selected.presence.lastHeartbeatTimeUtc)}</dd>
              <dt>{t('personal.asset.observed')}</dt>
              <dd>{time(selected.presence.observedTimeUtc)}</dd>
              <dt>{t('personal.asset.expires')}</dt>
              <dd>{time(selected.presence.expiresTimeUtc)}</dd>
              <dt>{t('personal.asset.placementUpdated')}</dt>
              <dd>{time(selected.placement.updateTimeUtc)}</dd>
              {selected.hostAssetId && (
                <>
                  <dt>{t('personal.asset.host')}</dt>
                  <dd>
                    {snapshot.assets.find((asset) => asset.assetId === selected.hostAssetId)
                      ?.name ?? t('personal.asset.hostUnavailable')}
                  </dd>
                </>
              )}
            </Box>
            {snapshot.assets.some((asset) => asset.hostAssetId === selected.assetId) && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('personal.asset.children')}
                </Typography>
                {snapshot.assets
                  .filter((asset) => asset.hostAssetId === selected.assetId)
                  .map((child) => (
                    <Button
                      key={child.assetId}
                      onClick={() => select(child.assetId)}
                      sx={{
                        display: 'block',
                        textAlign: 'left',
                        minHeight: 44,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {child.name}
                      {child.demoKind ? ` · ${t(`personal.asset.kind.${child.demoKind}`)}` : ''}
                    </Button>
                  ))}
              </Box>
            )}
            <Divider sx={{ my: 3 }} />
            <PlacementEditor
              key={`${selected.assetId}:${selected.placement.version}`}
              asset={selected}
              canPlace={canPlace}
              demo={demo}
              onPlace={async (asset, site, floor) => {
                const placement = await onPlace(asset, site, floor);
                setNotice(true);
                if (placement.site && placement.floor) {
                  const { site: nextSite, floor: nextFloor } = placement;
                  setFloors((value) => ({ ...value, [nextSite]: nextFloor }));
                }
                return placement;
              }}
            />
          </Box>
        )}
      </Drawer>
    </Stack>
  );
}

function PlacementEditor({
  asset,
  canPlace,
  demo,
  onPlace,
}: {
  asset: AssetView;
  canPlace: boolean;
  demo: boolean;
  onPlace: SavePlacement;
}) {
  const t = useTranslation();
  const [site, setSite] = useState<Site | ''>(asset.placement.site ?? '');
  const [floor, setFloor] = useState(asset.placement.floor ?? 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canPlace || locked.current) return;
    locked.current = true;
    setPending(true);
    setError(null);
    try {
      await onPlace(asset, site || null, site ? floor : null);
    } catch (failure: unknown) {
      const classified = classifyApiFailure(failure);
      if (active.current && classified.kind !== 'session')
        setError(
          classified.kind === 'unknown'
            ? 'personal.asset.saveUnknown'
            : 'personal.asset.saveFailed',
        );
    } finally {
      locked.current = false;
      if (active.current) setPending(false);
    }
  };
  return (
    <Box component="form" onSubmit={(event) => void submit(event)}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {t('personal.asset.placement')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('personal.asset.placementHelp')}
      </Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <TextField
          select
          size="small"
          label={t('personal.asset.location')}
          value={site}
          disabled={!canPlace || pending || !!asset.demoKind}
          onChange={(event) => {
            const value = event.target.value;
            if (value === '' || value === 'OpenLife' || value === 'OpenMind') {
              setSite(value);
              if (value === 'OpenLife') setFloor(1);
            }
          }}
        >
          <MenuItem value="">{t('personal.asset.pending')}</MenuItem>
          {sites.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        {site && (
          <TextField
            select
            size="small"
            label={t('personal.asset.floor')}
            value={floor}
            disabled={!canPlace || pending || !!asset.demoKind}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value === 1 || value === 2 || value === 3 || value === 4) setFloor(value);
            }}
          >
            {(site === 'OpenLife' ? [1] : [1, 2, 3, 4]).map((level) => (
              <MenuItem key={level} value={level}>
                {level}F
              </MenuItem>
            ))}
          </TextField>
        )}
        {error && <Alert severity="warning">{t(error)}</Alert>}
        {canPlace && !asset.demoKind ? (
          <Button type="submit" variant="contained" disabled={pending} sx={{ minHeight: 44 }}>
            {t(pending ? 'common.loading' : demo ? 'personal.asset.demoSave' : 'common.save')}
          </Button>
        ) : (
          <Typography variant="caption" color="text.secondary">
            {t(asset.demoKind ? 'personal.asset.virtualPlacement' : 'personal.asset.readOnly')}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
