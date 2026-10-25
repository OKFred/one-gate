import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { AutoAwesome, Refresh } from '@mui/icons-material';
import { overviewFn, refreshFn } from '@/api/admin/maintenance/cloudflare-usage';
import { classifyApiFailure } from '@/api/config';
import { useTranslation } from '@/hooks/useTranslation';
import { permissions, usePermission } from '@/hooks/usePermission';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';
import type { Overview, UsageDays } from './usage-types';
import { dateText, hasQuota, metricName, warningKey } from './usage-format';
import { MetricDetailsDialog, UsageCosts, UsageDetails, UsageMetricCard } from './UsagePanels';
import UsageTrend from './UsageTrend';

export default function HomePage() {
  const t = useTranslation();
  const { permissionCodes, loading: permissionsLoading } = usePermission();
  const allowed = permissionCodes.has(permissions.admin.maintenance.cloudflare_usage.read);
  const mayRefresh =
    allowed && permissionCodes.has(permissions.admin.maintenance.cloudflare_usage.update);
  const chatAllowed = permissionCodes.has(permissions.admin.ai.chat.read);
  const [data, setData] = useState<Overview | null>(null);
  const [days, setDays] = useState<UsageDays>(7);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [metricId, setMetricId] = useState('');
  const [revision, setRevision] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [coverageExpanded, setCoverageExpanded] = useState(false);
  const generation = useRef(0);
  const refreshLock = useRef(false);
  const refreshController = useRef<AbortController | null>(null);
  const unknown = t('home.usage.unknown');

  useEffect(() => {
    const requestGeneration = ++generation.current;
    const auth = captureAuthSession();
    const abort = new AbortController();
    const current = () => generation.current === requestGeneration && isCurrentAuthSession(auth);
    if (!allowed) {
      setData(null);
      setDetailId(null);
      setCoverageExpanded(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    void overviewFn({
      data: { days },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setError(t('home.usage.loadFailed'));
            return;
          }
          setData(response.data.data);
        },
        (failure: unknown) => {
          if (current() && classifyApiFailure(failure).kind !== 'session')
            setError(t('home.usage.loadFailed'));
        },
      )
      .finally(() => {
        if (current()) setLoading(false);
      });
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(auth)) return;
      generation.current += 1;
      abort.abort();
      refreshController.current?.abort();
      refreshLock.current = false;
      setData(null);
      setDetailId(null);
      setCoverageExpanded(false);
      setError(undefined);
      setRefreshMessage(undefined);
      setRefreshing(false);
      setLoading(false);
    });
    return () => {
      generation.current += 1;
      abort.abort();
      refreshController.current?.abort();
      unsubscribe();
    };
  }, [allowed, days, revision, t]);

  const refresh = async () => {
    if (!mayRefresh || refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    setRefreshMessage(undefined);
    setError(undefined);
    const auth = captureAuthSession();
    const requestGeneration = generation.current;
    const abort = new AbortController();
    refreshController.current = abort;
    const current = () =>
      generation.current === requestGeneration &&
      isCurrentAuthSession(auth) &&
      !abort.signal.aborted;
    await refreshFn({
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setError(t('home.usage.refreshFailed'));
            return;
          }
          setRefreshMessage(
            response.data.data.accepted
              ? t('home.usage.refreshQueued')
              : `${t('home.usage.refreshLater')} ${dateText(response.data.data.eligibleTimeUtc, unknown)}`,
          );
          setRevision((value) => value + 1);
        },
        (failure: unknown) => {
          if (current() && classifyApiFailure(failure).kind !== 'session')
            setError(t('home.usage.refreshFailed'));
        },
      )
      .finally(() => {
        refreshLock.current = false;
        if (isCurrentAuthSession(auth)) setRefreshing(false);
      });
  };

  const metrics = data?.metrics ?? [];
  const defaultMetric =
    metrics.find((metric) => hasQuota(metric) && metric.used !== null) ?? metrics[0];
  const selectedMetric = metrics.find((metric) => metric.id === metricId) ?? defaultMetric;
  const detailMetric = metrics.find((metric) => metric.id === detailId);
  const highUsageCount = metrics.filter((metric) => warningKey(metric) !== null).length;
  const knownQuotaCount = metrics.filter(hasQuota).length;
  const stale = metrics.some((metric) => metric.status === 'stale');

  return (
    <Stack spacing={2} sx={{ maxWidth: 1500, mx: 'auto', minWidth: 0, color: 'text.primary' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {allowed ? t('home.usage.title') : t('home.title')}
          </Typography>
          {allowed && data && (
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {data.account?.name ?? data.account?.id ?? t('home.usage.noAccount')}
              {' · '}
              {t('home.usage.updated')}: {dateText(data.collectedTimeUtc, unknown)}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {chatAllowed && (
            <Button
              component={RouterLink}
              to="/admin/ai/chat"
              startIcon={<AutoAwesome />}
              size="small"
            >
              {t('home.openChat')}
            </Button>
          )}
          {mayRefresh && (
            <Button
              variant="outlined"
              size="small"
              startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
              disabled={refreshing || loading}
              onClick={() => void refresh()}
            >
              {t('home.usage.refresh')}
            </Button>
          )}
        </Stack>
      </Stack>
      {permissionsLoading && <LinearProgress aria-label={t('home.usage.loading')} />}
      {!allowed && !permissionsLoading && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography>{t('home.welcome')}</Typography>
        </Paper>
      )}
      {allowed && (
        <>
          {loading && <LinearProgress aria-label={t('home.usage.loading')} />}
          {error && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  disabled={loading}
                  onClick={() => setRevision((value) => value + 1)}
                >
                  {t('home.usage.reload')}
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {refreshMessage && <Alert severity="info">{refreshMessage}</Alert>}
          {data && (
            <>
              {data.configuration !== 'configured' && (
                <Alert severity="info">{t('home.usage.configuration.' + data.configuration)}</Alert>
              )}
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap', alignItems: 'center' }}
              >
                <Chip
                  size="small"
                  label={t('home.usage.sync.' + data.sync.state)}
                  color={
                    data.sync.state === 'failed'
                      ? 'error'
                      : data.sync.state === 'partial'
                        ? 'warning'
                        : 'default'
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  {t('home.usage.verifiedQuotas', {
                    count: knownQuotaCount,
                    total: metrics.length,
                  })}
                </Typography>
                {highUsageCount > 0 && (
                  <Chip
                    size="small"
                    color="warning"
                    label={t('home.usage.attentionCount', { count: highUsageCount })}
                  />
                )}
              </Stack>
              {(data.sync.state === 'failed' || stale) && (
                <Alert severity="warning">
                  {t(
                    data.sync.state === 'failed'
                      ? 'home.usage.syncFailedShort'
                      : 'home.usage.staleShort',
                  )}
                </Alert>
              )}
              <UsageCosts data={data} />
              <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
                <Stack spacing={1.5}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {t('home.usage.trend')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('home.usage.rangeHelp')}
                      </Typography>
                    </Box>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{ minWidth: 0, alignItems: { sm: 'center' } }}
                    >
                      {selectedMetric && (
                        <FormControl
                          size="small"
                          sx={{ minWidth: { xs: 0, sm: 200 }, maxWidth: { xs: '100%', sm: 340 } }}
                        >
                          <InputLabel id="trend-metric-label">{t('home.usage.metric')}</InputLabel>
                          <Select
                            labelId="trend-metric-label"
                            label={t('home.usage.metric')}
                            value={selectedMetric.id}
                            onChange={(event) => setMetricId(event.target.value)}
                          >
                            {metrics.map((metric) => (
                              <MenuItem value={metric.id} key={metric.id}>
                                {metric.product} · {metricName(metric, t)} ({metric.unit})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      <ToggleButtonGroup
                        exclusive
                        value={days}
                        size="small"
                        aria-label={t('home.usage.range')}
                        onChange={(_, value: UsageDays | null) => {
                          if (value !== null) setDays(value);
                        }}
                        sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                      >
                        {([1, 3, 7, 30] as const).map((value) => (
                          <ToggleButton key={value} value={value}>
                            {t('home.usage.days' + value)}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Stack>
                  </Stack>
                  {selectedMetric ? (
                    <UsageTrend
                      metric={selectedMetric}
                      history={data.history.filter((point) => point.metricId === selectedMetric.id)}
                      days={days}
                    />
                  ) : (
                    <Typography color="text.secondary">{t('home.usage.noHistory')}</Typography>
                  )}
                </Stack>
              </Paper>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {t('home.usage.allMetrics')}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(3, minmax(0, 1fr))',
                      xl: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: 1.5,
                  }}
                >
                  {metrics.map((metric) => (
                    <UsageMetricCard
                      key={metric.id}
                      metric={metric}
                      selected={selectedMetric?.id === metric.id}
                      onSelect={() => setMetricId(metric.id)}
                      onDetails={() => setDetailId(metric.id)}
                    />
                  ))}
                </Box>
                {metrics.length === 0 && <Alert severity="info">{t('home.usage.noMetrics')}</Alert>}
              </Box>
              <UsageDetails
                data={data}
                coverageExpanded={coverageExpanded}
                onCoverageChange={setCoverageExpanded}
              />
              <MetricDetailsDialog metric={detailMetric} onClose={() => setDetailId(null)} />
            </>
          )}
        </>
      )}
    </Stack>
  );
}
