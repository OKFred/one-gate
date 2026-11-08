import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography, useTheme } from '@mui/material';
import { RestartAlt } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import {
  createSpacesRenderer,
  type HoveredAsset,
  type SceneState,
  type SpacesRenderer,
} from './threeScene';

export function ThreeViewport({
  state,
  onSelect,
}: {
  state: SceneState;
  onSelect(assetId: string): void;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const runtime = useRef<SpacesRenderer | null>(null);
  const select = useRef(onSelect);
  const [mode, setMode] = useState<'loading' | 'ready' | 'unavailable' | 'lost'>('loading');
  const [hovered, setHovered] = useState<HoveredAsset | null>(null);
  const colors = useMemo(
    () => ({
      background: theme.palette.background.default,
      paper: theme.palette.background.paper,
      primary: theme.palette.primary.main,
      border: theme.palette.grey[400],
      text: theme.palette.grey[600],
      online: theme.palette.success.main,
      offline: theme.palette.error.main,
      lost: theme.palette.warning.main,
      unknown: theme.palette.grey[500],
    }),
    [theme],
  );
  const initialColors = useRef(colors);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    if (!canvas.current) return;
    let instance: SpacesRenderer | undefined;
    try {
      instance = createSpacesRenderer(canvas.current, initialColors.current, {
        onSelect: (assetId) => select.current(assetId),
        onHover: setHovered,
        onLost: () => setMode('lost'),
        onReady: () => setMode('ready'),
      });
      runtime.current = instance;
    } catch {
      setMode('unavailable');
    }
    return () => {
      runtime.current = null;
      instance?.dispose();
    };
  }, []);
  useEffect(() => {
    runtime.current?.setColors(colors);
  }, [colors]);
  useEffect(() => {
    if (!runtime.current) return;
    try {
      runtime.current.update(state);
    } catch {
      runtime.current.dispose();
      runtime.current = null;
      setMode('unavailable');
    }
  }, [state]);
  const asset = hovered ? state.assets.find((item) => item.assetId === hovered.assetId) : null;
  return (
    <Box data-render-state={mode}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1 }}
      >
        <Box>
          <Typography variant="body2">{t('personal.asset.sceneControls')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('personal.asset.touchControls')}
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<RestartAlt />}
          disabled={mode !== 'ready'}
          onClick={() => runtime.current?.reset()}
          sx={{ minHeight: 44, flexShrink: 0 }}
        >
          {t('personal.asset.resetView')}
        </Button>
      </Stack>
      {mode === 'loading' && (
        <Typography variant="body2">{t('personal.asset.loading3d')}</Typography>
      )}
      {(mode === 'unavailable' || mode === 'lost') && (
        <Alert severity="info">
          {t(mode === 'lost' ? 'personal.asset.webglLost' : 'personal.asset.webglUnavailable')}
        </Alert>
      )}
      <Box
        sx={{
          position: 'relative',
          height: { xs: 400, sm: 480, lg: 550 },
          minHeight: 300,
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          display: mode === 'lost' || mode === 'unavailable' ? 'none' : 'block',
        }}
      >
        <Box
          component="canvas"
          ref={canvas}
          data-testid="asset-three-canvas"
          role="img"
          aria-label={t('personal.asset.sceneLabel')}
          tabIndex={0}
          sx={{
            display: 'block',
            width: '100%',
            height: '100%',
            touchAction: 'none',
            cursor: 'grab',
            outlineOffset: -3,
            '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main' },
          }}
        />
        {hovered && asset && (
          <Chip
            size="small"
            label={asset.name}
            sx={{
              position: 'absolute',
              top: Math.max(8, hovered.y - 35),
              left: Math.max(8, hovered.x - 80),
              maxWidth: 'min(300px,80%)',
              pointerEvents: 'none',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        )}
      </Box>
    </Box>
  );
}
