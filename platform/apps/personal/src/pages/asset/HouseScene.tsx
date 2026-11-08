import { Box, Button, ButtonBase, Chip, Paper, Stack, Typography, useTheme } from '@mui/material';
import { Computer, HomeOutlined, Storage, Memory, Sensors } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import { effectivePresence, statusColors, type AssetView, type Site } from './model';

export function AssetIcon({ category }: { category: string }) {
  if (category === 'host') return <Computer fontSize="small" />;
  if (category === 'disk') return <Storage fontSize="small" />;
  if (category === 'sensor' || category === 'meter') return <Sensors fontSize="small" />;
  return <Memory fontSize="small" />;
}

export function StatusChip({ asset, now }: { asset: AssetView; now: number }) {
  const t = useTranslation();
  const status = effectivePresence(asset, now).status;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={statusColors[status]}
      label={t(`personal.asset.status.${status}`)}
    />
  );
}

export function ConnectionStrip() {
  const t = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={{ xs: 0.5, sm: 1.5 }}
      sx={{ alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}
    >
      <Typography variant="caption">OpenLife</Typography>
      <Box
        component="svg"
        viewBox="0 0 180 14"
        aria-hidden="true"
        sx={{
          width: { xs: 20, sm: 100 },
          height: 14,
          overflow: 'visible',
          '& path': { animation: 'asset-link 2s linear infinite' },
          '@keyframes asset-link': { to: { strokeDashoffset: -20 } },
          '@media (prefers-reduced-motion: reduce)': { '& path': { animation: 'none' } },
        }}
      >
        <path d="M0 7H180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" />
      </Box>
      <Typography variant="caption">{t('personal.asset.connection')}</Typography>
      <Box
        component="svg"
        viewBox="0 0 180 14"
        aria-hidden="true"
        sx={{ width: { xs: 20, sm: 100 }, height: 14 }}
      >
        <path d="M0 7H180" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" />
      </Box>
      <Typography variant="caption">OpenMind</Typography>
    </Stack>
  );
}

export function HouseScene({
  site,
  floor,
  assets,
  selectedId,
  now,
  onFloorChange,
  onSelect,
  onShowFloor,
}: {
  site: Site;
  floor: number;
  assets: AssetView[];
  selectedId: string | null;
  now: number;
  onFloorChange: (floor: number) => void;
  onSelect: (assetId: string) => void;
  onShowFloor: () => void;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const palette = theme.palette;
  const floors = site === 'OpenLife' ? [1] : [1, 2, 3, 4];
  const residents = assets.filter(
    (asset) => !asset.demoKind && asset.placement.site === site && asset.placement.floor === floor,
  );
  const levelY = (level: number) => (site === 'OpenLife' ? 190 : 270 - (level - 1) * 65);
  const activeY = levelY(floor);
  const anchors = [
    [31, activeY + 2],
    [50, activeY - 21],
    [70, activeY + 3],
    [43, activeY + 61],
    [64, activeY + 62],
  ];
  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label={t('personal.asset.houseLabel', { site })}
      sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, minWidth: 0, overflow: 'hidden' }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <HomeOutlined color="primary" />
          <Box>
            <Typography component="h2" variant="h6" sx={{ lineHeight: 1.3 }}>
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
            count: assets.filter((asset) => !asset.demoKind && asset.placement.site === site)
              .length,
          })}
        />
      </Stack>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ mt: 2 }}
        aria-label={t('personal.asset.floorPicker', { site })}
      >
        {floors.map((level) => (
          <Button
            key={level}
            variant={floor === level ? 'contained' : 'text'}
            size="small"
            aria-pressed={floor === level}
            onClick={() => onFloorChange(level)}
            sx={{ minWidth: 48, minHeight: 44, boxShadow: 'none' }}
          >
            {level}F
          </Button>
        ))}
      </Stack>
      <Box sx={{ position: 'relative', aspectRatio: '500 / 420', maxWidth: 580, mx: 'auto' }}>
        <svg width="100%" height="100%" viewBox="0 0 500 420" aria-hidden="true">
          <ellipse cx="252" cy="389" rx="205" ry="18" fill={palette.action.selected} />
          {floors.map((level) => {
            const y = levelY(level);
            const active = floor === level;
            const ghost = level > floor;
            return (
              <g key={level} opacity={ghost ? 0.23 : 1}>
                <path
                  d={`M40 ${y + 15} L270 ${y + 115} L460 ${y + 5} V${y + 17} L270 ${y + 127} L40 ${y + 27} Z`}
                  fill={active ? palette.primary.light : palette.action.selected}
                  stroke={palette.divider}
                />
                <path
                  d={`M40 ${y + 15} L225 ${y - 75} L460 ${y + 5} L270 ${y + 115} Z`}
                  fill={ghost ? 'none' : palette.background.paper}
                  stroke={active ? palette.primary.main : palette.divider}
                  strokeWidth={active ? 2 : 1}
                />
                {active && (
                  <>
                    <path
                      d={`M40 ${y + 15} V${y - 31} L225 ${y - 121} V${y - 75} M225 ${y - 121} L460 ${y - 41} V${y + 5}`}
                      fill={palette.action.hover}
                      stroke={palette.divider}
                    />
                    <path
                      d={`M145 ${y - 36} L363 ${y + 42} M328 ${y - 39} L149 ${y + 62}`}
                      fill="none"
                      stroke={palette.divider}
                      strokeWidth="2"
                    />
                    <path
                      d={`M55 ${y + 22} L270 ${y + 115} L445 ${y + 15}`}
                      fill="none"
                      stroke={palette.primary.main}
                      strokeWidth="3"
                    />
                  </>
                )}
                <text
                  x="466"
                  y={y + 28}
                  fill={active ? palette.primary.main : palette.text.secondary}
                  fontSize="12"
                  fontFamily="inherit"
                >
                  {level}F
                </text>
              </g>
            );
          })}
          {site === 'OpenLife' && (
            <path
              d="M27 152 L225 44 L474 137 M225 44 V58"
              fill="none"
              stroke={palette.divider}
              strokeWidth="2"
              strokeDasharray="5 5"
            />
          )}
        </svg>
        {residents.slice(0, anchors.length).map((asset, index) => {
          const [left, top] = anchors[index];
          const status = effectivePresence(asset, now).status;
          const color = status === 'unknown' ? 'text.secondary' : `${statusColors[status]}.main`;
          return (
            <ButtonBase
              key={asset.assetId}
              onClick={() => onSelect(asset.assetId)}
              aria-label={`${asset.name}, ${floor}F, ${t(`personal.asset.status.${status}`)}`}
              aria-pressed={asset.assetId === selectedId}
              title={asset.name}
              sx={{
                position: 'absolute',
                left: `${left}%`,
                top: `${(top / 420) * 100}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                width: { xs: 62, sm: 76 },
                minHeight: 56,
                p: 0.5,
                borderRadius: 1.5,
                color: 'text.primary',
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: asset.assetId === selectedId ? 'primary.main' : 'divider',
                boxShadow: 1,
                '&:hover': { bgcolor: 'action.hover' },
                '&.Mui-focusVisible': {
                  outline: '3px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 3,
                },
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <AssetIcon category={asset.category} />
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
              </Stack>
              <Typography
                component="span"
                noWrap
                sx={{ fontSize: 10, width: '100%', lineHeight: 1.5 }}
              >
                {asset.name}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: -1 }}>
        <Typography variant="caption" color="text.secondary">
          {t('personal.asset.diagram')}
        </Typography>
        <Button size="small" onClick={onShowFloor} sx={{ minHeight: 44 }}>
          {t('personal.asset.floorAssets', { floor, count: residents.length })}
        </Button>
      </Stack>
    </Paper>
  );
}
