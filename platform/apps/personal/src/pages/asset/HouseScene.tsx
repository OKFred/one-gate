import { Box, Button, ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material';
import { Computer, HomeOutlined, Storage, Memory, Sensors } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import { effectivePresence, sites, statusColors, type AssetView, type Site } from './model';
import { ThreeViewport } from './ThreeViewport';

export function AssetIcon({ category }: { category: string }) {
  if (category === 'host') return <Computer fontSize="small" />;
  if (category === 'disk') return <Storage fontSize="small" />;
  if (category === 'sensor' || category === 'meter') return <Sensors fontSize="small" />;
  return <Memory fontSize="small" />;
}

export function StatusChip({ asset, now }: { asset: AssetView; now: number }) {
  const t = useTranslation();
  return (
    <Chip
      size="small"
      variant="outlined"
      color={statusColors[effectivePresence(asset, now).status]}
      label={t(`personal.asset.status.${effectivePresence(asset, now).status}`)}
    />
  );
}

export function AssetSpacesScene({
  floors,
  assets,
  selectedId,
  now,
  onFloorChange,
  onSelect,
  onShowFloor,
}: {
  floors: Record<Site, number>;
  assets: AssetView[];
  selectedId: string | null;
  now: number;
  onFloorChange(site: Site, floor: number): void;
  onSelect(assetId: string): void;
  onShowFloor(site: Site): void;
}) {
  const t = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
        <Typography component="h2" variant="h6">
          {t('personal.asset.sceneLabel')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          OpenLife ↔ {t('personal.asset.internet')} ↔ OpenMind · {t('personal.asset.connection')}
        </Typography>
      </Stack>
      <ThreeViewport
        state={{ floors, assets, selectedId, now, internetLabel: t('personal.asset.internet') }}
        onSelect={onSelect}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(2,minmax(0,1fr))' },
          gap: 2,
          mt: 2,
        }}
      >
        {sites.map((site) => {
          const residents = assets.filter(
            (asset) =>
              !asset.demoKind &&
              asset.placement.site === site &&
              asset.placement.floor === floors[site],
          );
          return (
            <Box
              key={site}
              component="section"
              aria-label={t('personal.asset.houseLabel', { site })}
              sx={{ minWidth: 0 }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <HomeOutlined color="primary" />
                  <Box>
                    <Typography component="h3" variant="subtitle1">
                      {site}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t(`personal.asset.site.${site}`)}
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  size="small"
                  label={t('personal.asset.deviceCount', {
                    count: assets.filter(
                      (asset) => !asset.demoKind && asset.placement.site === site,
                    ).length,
                  })}
                />
              </Stack>
              <Stack
                direction="row"
                spacing={0.5}
                aria-label={t('personal.asset.floorPicker', { site })}
                sx={{ mt: 1 }}
              >
                {(site === 'OpenLife' ? [1] : [1, 2, 3, 4]).map((floor) => (
                  <Button
                    key={floor}
                    size="small"
                    aria-pressed={floors[site] === floor}
                    variant={floors[site] === floor ? 'contained' : 'text'}
                    onClick={() => onFloorChange(site, floor)}
                    sx={{ minWidth: 48, minHeight: 44, boxShadow: 'none' }}
                  >
                    {floor}F
                  </Button>
                ))}
              </Stack>
              <Box
                aria-label={t('personal.asset.currentFloorDevices')}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.75,
                  maxHeight: 140,
                  overflowY: 'auto',
                  py: 1,
                }}
              >
                {residents.map((asset) => {
                  const status = effectivePresence(asset, now).status;
                  return (
                    <ButtonBase
                      key={asset.assetId}
                      onClick={() => onSelect(asset.assetId)}
                      aria-label={`${asset.name}, ${floors[site]}F, ${t(`personal.asset.status.${status}`)}`}
                      aria-pressed={asset.assetId === selectedId}
                      title={asset.name}
                      sx={{
                        border: '1px solid',
                        borderColor: asset.assetId === selectedId ? 'primary.main' : 'divider',
                        bgcolor: asset.assetId === selectedId ? 'action.selected' : 'transparent',
                        borderRadius: 1.5,
                        px: 1,
                        minHeight: 44,
                        maxWidth: '100%',
                        display: 'flex',
                        gap: 0.75,
                        '&:hover': { bgcolor: 'action.hover' },
                        '&.Mui-focusVisible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                        },
                      }}
                    >
                      <AssetIcon category={asset.category} />
                      <Typography noWrap variant="caption">
                        {asset.name}
                      </Typography>
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          flexShrink: 0,
                          borderRadius: '50%',
                          bgcolor:
                            status === 'unknown'
                              ? 'text.secondary'
                              : `${statusColors[status]}.main`,
                        }}
                      />
                    </ButtonBase>
                  );
                })}
                {!residents.length && (
                  <Typography variant="caption" color="text.secondary">
                    {t('personal.asset.noFloorAssets')}
                  </Typography>
                )}
              </Box>
              <Button size="small" onClick={() => onShowFloor(site)} sx={{ minHeight: 44 }}>
                {t('personal.asset.floorAssets', { floor: floors[site], count: residents.length })}
              </Button>
            </Box>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('personal.asset.diagram')}
      </Typography>
    </Paper>
  );
}
