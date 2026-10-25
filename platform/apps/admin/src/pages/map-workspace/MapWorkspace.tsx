import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { ArrowBack, RestartAlt } from '@mui/icons-material';
import { configFn } from '@/api/admin/base/map';
import { classifyApiFailure } from '@/api/config';
import { useTranslation } from '@/hooks/useTranslation';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import {
  createTiandituMap,
  type Basemap,
  type TiandituMapController,
  type TilePhase,
} from './tianditu-map';
import 'leaflet/dist/leaflet.css';

type WorkspacePhase =
  | TilePhase
  | 'config-loading'
  | 'not-configured'
  | 'config-error'
  | 'init-error';

const FAILURE_KEYS = {
  'not-configured': 'map.notConfigured',
  'config-error': 'map.configFailed',
  'init-error': 'map.initFailed',
  'tile-error': 'map.tilesFailed',
  'tile-timeout': 'map.tilesTimeout',
} as const;

export default function MapWorkspace() {
  const t = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<WorkspacePhase>('config-loading');
  const [basemap, setBasemap] = useState<Basemap>('vector');
  const [initialized, setInitialized] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);
  const controller = useRef<TiandituMapController | null>(null);
  const generation = useRef(0);
  const requestLock = useRef(false);
  const basemapRef = useRef<Basemap>('vector');

  useEffect(() => {
    const requestGeneration = ++generation.current;
    const auth = captureAuthSession();
    const abort = new AbortController();
    let animationFrame: number | undefined;
    const current = () =>
      requestGeneration === generation.current &&
      isCurrentAuthSession(auth) &&
      !abort.signal.aborted;
    const clearMap = () => {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
      controller.current?.dispose();
      controller.current = null;
    };
    setPhase('config-loading');
    setInitialized(false);
    requestLock.current = true;

    if (auth.token) {
      void configFn({
        signal: abort.signal,
        ignoreAbort: true,
        errorPresentation: 'local',
        shouldPresentError: current,
      })
        .then(
          (response) => {
            if (!current()) return;
            if (response.data?.ok !== true || !response.data.data) {
              setPhase('config-error');
              return;
            }
            const configuration = response.data.data;
            if (!configuration.configured || configuration.browserKey === null) {
              setPhase('not-configured');
              return;
            }
            const browserKey = configuration.browserKey;
            if (typeof browserKey !== 'string' || !/^[a-f0-9]{32}$/i.test(browserKey)) {
              setPhase('config-error');
              return;
            }
            setPhase('tiles-loading');
            // Wait for the visible canvas to commit before calculating its initial view.
            animationFrame = window.requestAnimationFrame(() => {
              animationFrame = undefined;
              if (!current() || !container.current) return;
              try {
                controller.current = createTiandituMap(
                  container.current,
                  browserKey,
                  basemapRef.current,
                  { zoomIn: t('map.zoomIn'), zoomOut: t('map.zoomOut') },
                  (nextPhase) => {
                    if (current()) setPhase(nextPhase);
                  },
                );
                setInitialized(true);
              } catch {
                if (current()) setPhase('init-error');
              }
            });
          },
          (failure: unknown) => {
            if (current() && classifyApiFailure(failure).kind !== 'session')
              setPhase('config-error');
          },
        )
        .finally(() => {
          if (current()) requestLock.current = false;
        });
    } else {
      requestLock.current = false;
    }

    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(auth)) return;
      generation.current += 1;
      abort.abort();
      clearMap();
      requestLock.current = false;
      setInitialized(false);
      setPhase('config-loading');
    });
    return () => {
      generation.current += 1;
      abort.abort();
      clearMap();
      unsubscribe();
    };
  }, [attempt, t]);

  const retry = () => {
    if (requestLock.current) return;
    requestLock.current = true;
    setPhase('config-loading');
    setAttempt((value) => value + 1);
  };
  const changeBasemap = (next: Basemap | null) => {
    if (next === null || next === basemap) return;
    basemapRef.current = next;
    setBasemap(next);
    controller.current?.setBasemap(next);
  };
  const failureKey =
    phase in FAILURE_KEYS ? FAILURE_KEYS[phase as keyof typeof FAILURE_KEYS] : null;
  const showCanvas = initialized || phase === 'tiles-loading';

  return (
    <Stack spacing={2} sx={{ minWidth: 0, maxWidth: 1500, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          {t('map.title')}
        </Typography>
        <Button component={RouterLink} to="/home" startIcon={<ArrowBack />} size="small">
          {t('map.backHome')}
        </Button>
      </Stack>
      <Paper variant="outlined" sx={{ overflow: 'hidden', minWidth: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ p: 1.5, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <ToggleButtonGroup
            value={basemap}
            exclusive
            size="small"
            disabled={!initialized}
            aria-label={t('map.basemap')}
            onChange={(_, next: Basemap | null) => changeBasemap(next)}
          >
            <ToggleButton value="vector">{t('map.vector')}</ToggleButton>
            <ToggleButton value="satellite">{t('map.satellite')}</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Box aria-live="polite">
              {phase === 'ready' && <Chip size="small" color="success" label={t('map.ready')} />}
            </Box>
            <Button
              size="small"
              disabled={!initialized}
              startIcon={<RestartAlt />}
              onClick={() => controller.current?.resetView()}
            >
              {t('map.resetView')}
            </Button>
          </Stack>
        </Stack>
        {(phase === 'config-loading' || phase === 'tiles-loading') && (
          <LinearProgress aria-label={t('map.loading')} />
        )}
        {failureKey && (
          <Alert
            severity={phase === 'not-configured' ? 'info' : 'warning'}
            action={
              <Button color="inherit" size="small" onClick={retry}>
                {t('map.retry')}
              </Button>
            }
            sx={{ m: 1.5 }}
          >
            {t(failureKey)}
          </Alert>
        )}
        <Box
          ref={container}
          data-testid="tianditu-map"
          data-map-state={phase}
          role="region"
          aria-label={t('map.canvas')}
          aria-describedby="tianditu-keyboard-help"
          tabIndex={0}
          sx={{
            display: showCanvas ? 'block' : 'none',
            height: 'clamp(360px, calc(100dvh - 260px), 760px)',
            minWidth: 0,
            bgcolor: 'background.default',
            color: 'text.primary',
            '& .leaflet-control-zoom a, & .leaflet-control-attribution': {
              bgcolor: 'background.paper',
              color: 'text.primary',
              borderColor: 'divider',
            },
            '& .leaflet-control-zoom a:hover': { bgcolor: 'action.hover' },
            '& .leaflet-control-attribution a': { color: 'primary.main' },
            '& .leaflet-control-scale-line': {
              bgcolor: 'background.paper',
              color: 'text.primary',
              borderColor: 'divider',
            },
          }}
        />
      </Paper>
      {showCanvas && (
        <Typography id="tianditu-keyboard-help" variant="caption" color="text.secondary">
          {t('map.keyboardHelp')}
        </Typography>
      )}
    </Stack>
  );
}
