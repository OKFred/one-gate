import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Key as KeyIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

import * as DeviceAPI from '@/api/admin/mobile/device';
import type {
  GetDeviceRes,
  ListDeviceEventRes,
  UpdateDeviceMetadataReq,
} from '@/api/admin/mobile/type';
import { showSnackbar } from '@/components/Notification';
import { ResponsiveButton } from '@/components/Responsive';
import { useTranslation } from '@/hooks/useTranslation';

import { THIS_PERMISSION } from '../constant';
import { ClientDeploymentPanel } from './ClientDeploymentPanel';

interface DeviceStatusDrawerProps {
  open: boolean;
  deviceId: number | null;
  clientId: string | null;
  onClose: () => void;
}

interface MetadataEditorRow {
  id: string;
  key: string;
  value: string;
  sensitive: boolean;
}

type DeviceEventRow = NonNullable<ListDeviceEventRes['list']>[number];
type EventTypeFilter = '' | DeviceEventRow['eventType'];

/** 判断未知值是否为普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 将元数据值转成可编辑文本。 */
function valueToEditorText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** 将服务端元数据快照转成键值编辑行。 */
function metadataToRows(metadata: Record<string, unknown>): MetadataEditorRow[] {
  return Object.entries(metadata).map(([key, raw], index) => {
    const entry = isRecord(raw) ? raw : { value: raw, sensitive: false };
    return {
      id: `${key}-${index}`,
      key,
      value: valueToEditorText(entry.value),
      sensitive: entry.sensitive === true,
    };
  });
}

/** 尝试按 JSON 解析编辑值，普通文本保持字符串。 */
function parseEditorValue(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

/** 安全格式化 JSON。 */
function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function DeviceStatusDrawer({ open, deviceId, clientId, onClose }: DeviceStatusDrawerProps) {
  const t = useTranslation();
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState<GetDeviceRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [metadataRows, setMetadataRows] = useState<MetadataEditorRow[]>([]);
  const [events, setEvents] = useState<DeviceEventRow[]>([]);
  const [eventType, setEventType] = useState<EventTypeFilter>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [revealed, setRevealed] = useState<unknown>(null);
  const [revealTitle, setRevealTitle] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const response = await DeviceAPI.getFn({ data: { id: deviceId }, ignoreAbort: true });
      const next = response.data.data;
      setDetail(next);
      setMetadataRows(metadataToRows(next.customMetadata));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const loadEvents = useCallback(async () => {
    if (!deviceId) return;
    try {
      const response = await DeviceAPI.listEventsFn({
        data: {
          deviceId,
          pageNo: 1,
          pageSize: 50,
          eventType: eventType || undefined,
          startTimeUtc: startTime ? dayjs(startTime).valueOf() : undefined,
          endTimeUtc: endTime ? dayjs(endTime).valueOf() : undefined,
        },
        ignoreAbort: true,
      });
      setEvents(response.data.data.list);
    } catch {}
  }, [deviceId, endTime, eventType, startTime]);

  useEffect(() => {
    if (!open) return;
    setTab(0);
    setRevealed(null);
    setToken(null);
    void loadDetail();
  }, [loadDetail, open]);

  useEffect(() => {
    if (!open || tab !== 2) return;
    void loadEvents();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadEvents();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [loadEvents, open, tab]);

  const reportedExtra = useMemo(() => detail?.reportedExtra ?? {}, [detail]);

  const updateMetadataRow = (id: string, update: Partial<MetadataEditorRow>) => {
    setMetadataRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...update } : row)));
  };

  const saveMetadata = async () => {
    if (!deviceId) return;
    const customMetadata: UpdateDeviceMetadataReq['customMetadata'] = {};
    for (const row of metadataRows) {
      const key = row.key.trim();
      if (!key) continue;
      customMetadata[key] = {
        value: parseEditorValue(row.value),
        sensitive: row.sensitive,
      };
    }
    try {
      await DeviceAPI.updateMetadataFn({ data: { id: deviceId, customMetadata } });
      showSnackbar({ message: t('mobile.device.metadataSaved'), type: 'success' });
      await loadDetail();
    } catch {}
  };

  const reveal = async (id: number, target: 'identifiers' | 'customMetadata' | 'event') => {
    try {
      const response = await DeviceAPI.revealSensitiveFn({ data: { id, target } });
      setRevealTitle(t(`mobile.device.reveal.${target}`));
      setRevealed(response.data.data);
    } catch {}
  };

  const resetToken = async () => {
    if (!deviceId) return;
    if (!window.confirm(t('mobile.device.resetTokenConfirm'))) return;
    try {
      const response = await DeviceAPI.resetReportTokenFn({ data: { id: deviceId } });
      setToken(response.data.data.token);
    } catch {}
  };

  const copyToken = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    showSnackbar({ message: t('mobile.device.tokenCopied'), type: 'success' });
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box sx={{ width: { xs: '100vw', sm: 720 }, p: 3 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">{t('mobile.device.statusDrawer')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {clientId}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label={t('common.close')}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Tabs value={tab} onChange={(_, value: number) => setTab(value)} sx={{ mt: 2 }}>
            <Tab label={t('mobile.device.tabs.overview')} />
            <Tab label={t('mobile.device.tabs.metadata')} />
            <Tab label={t('mobile.device.tabs.events')} />
            <Tab label={t('mobile.device.tabs.deployments')} />
          </Tabs>
          <Divider />

          {tab === 0 && (
            <Stack spacing={2} sx={{ mt: 3 }}>
              {loading && <Typography>{t('common.loading')}</Typography>}
              {detail && (
                <>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    <Chip
                      color={detail.isOnline ? 'success' : 'default'}
                      label={detail.isOnline ? t('status.online') : t('status.offline')}
                    />
                    <Chip label={`${t('mobile.device.battery')}: ${detail.batteryLevel ?? '-'}%`} />
                    <Chip label={`${t('mobile.device.network')}: ${detail.networkType ?? '-'}`} />
                  </Stack>
                  <Box>
                    <Typography variant="subtitle2">{t('mobile.device.hardware')}</Typography>
                    <Typography>
                      {[detail.manufacturer, detail.brand, detail.model]
                        .filter(Boolean)
                        .join(' / ') || '-'}
                    </Typography>
                    <Typography color="text.secondary">
                      Android {detail.androidVersion ?? '-'} / SDK {detail.androidSdk ?? '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">{t('mobile.device.clientVersions')}</Typography>
                    <Typography>
                      AutoJS6 {detail.autojs6Version ?? '-'} / Client {detail.clientVersion ?? '-'}{' '}
                      / Protocol {detail.protocolVersion ?? '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">{t('mobile.device.identifiers')}</Typography>
                    <Typography>IMEI: {detail.imeiMasked.join(', ') || '-'}</Typography>
                    <Typography>
                      {t('mobile.device.serial')}: {detail.serialMasked ?? '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2">{t('mobile.device.capabilities')}</Typography>
                    <Box component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0, fontSize: 12 }}>
                      {prettyJson(detail.capabilities)}
                    </Box>
                  </Box>
                  <Typography color="text.secondary">
                    {t('mobile.device.lastHeartbeat')}:{' '}
                    {detail.lastHeartbeatTimeUtc
                      ? dayjs(detail.lastHeartbeatTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                      : '-'}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <ResponsiveButton
                      startIcon={<VisibilityIcon />}
                      permissionCodes={[THIS_PERMISSION.view]}
                      onClick={() => void reveal(detail.id, 'identifiers')}
                    >
                      {t('mobile.device.revealIdentifiers')}
                    </ResponsiveButton>
                    <ResponsiveButton
                      startIcon={<KeyIcon />}
                      color="warning"
                      permissionCodes={[THIS_PERMISSION.edit]}
                      onClick={() => void resetToken()}
                    >
                      {t('mobile.device.resetToken')}
                    </ResponsiveButton>
                  </Stack>
                </>
              )}
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={3} sx={{ mt: 3 }}>
              <Box>
                <Typography variant="subtitle1">{t('mobile.device.reportedExtra')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('mobile.device.reportedExtraHint')}
                </Typography>
                <Box
                  component="pre"
                  sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, overflow: 'auto' }}
                >
                  {prettyJson(reportedExtra)}
                </Box>
              </Box>
              <Divider />
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">{t('mobile.device.customMetadata')}</Typography>
                <IconButton
                  onClick={() =>
                    setMetadataRows((rows) => [
                      ...rows,
                      { id: crypto.randomUUID(), key: '', value: '', sensitive: false },
                    ])
                  }
                >
                  <AddIcon />
                </IconButton>
              </Stack>
              {metadataRows.map((row) => (
                <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label={t('mobile.device.metadataKey')}
                    value={row.key}
                    onChange={(event) => updateMetadataRow(row.id, { key: event.target.value })}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField
                    label={t('mobile.device.metadataValue')}
                    value={row.value}
                    onChange={(event) => updateMetadataRow(row.id, { value: event.target.value })}
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={row.sensitive}
                        onChange={(event) =>
                          updateMetadataRow(row.id, { sensitive: event.target.checked })
                        }
                      />
                    }
                    label={t('mobile.device.sensitive')}
                  />
                  <IconButton
                    color="error"
                    onClick={() =>
                      setMetadataRows((rows) => rows.filter((item) => item.id !== row.id))
                    }
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <ResponsiveButton
                  permissionCodes={[THIS_PERMISSION.edit]}
                  onClick={() => void saveMetadata()}
                >
                  {t('common.save')}
                </ResponsiveButton>
                <ResponsiveButton
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  permissionCodes={[THIS_PERMISSION.view]}
                  disabled={!deviceId}
                  onClick={() => deviceId && void reveal(deviceId, 'customMetadata')}
                >
                  {t('mobile.device.revealSensitiveMetadata')}
                </ResponsiveButton>
              </Stack>
            </Stack>
          )}

          {tab === 2 && (
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Select
                  value={eventType}
                  displayEmpty
                  onChange={(event) => setEventType(event.target.value as EventTypeFilter)}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">{t('mobile.device.allEvents')}</MenuItem>
                  {(['battery', 'network', 'sms', 'notification'] as const).map((type) => (
                    <MenuItem value={type} key={type}>
                      {t(`mobile.device.event.${type}`)}
                    </MenuItem>
                  ))}
                </Select>
                <TextField
                  type="datetime-local"
                  label={t('mobile.device.startTime')}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  type="datetime-local"
                  label={t('mobile.device.endTime')}
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <IconButton onClick={() => void loadEvents()}>
                  <RefreshIcon />
                </IconButton>
              </Stack>
              {events.length === 0 && <Alert severity="info">{t('mobile.device.noEvents')}</Alert>}
              {events.map((event) => (
                <Box
                  key={event.id}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}
                >
                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip size="small" label={t(`mobile.device.event.${event.eventType}`)} />
                      <Typography variant="body2">
                        {dayjs(event.eventTimeUtc).format('YYYY-MM-DD HH:mm:ss')}
                      </Typography>
                    </Stack>
                    {event.hasSensitivePayload && (
                      <ResponsiveButton
                        size="small"
                        variant="text"
                        permissionCodes={[THIS_PERMISSION.view]}
                        onClick={() => void reveal(event.id, 'event')}
                      >
                        {t('mobile.device.reveal')}
                      </ResponsiveButton>
                    )}
                  </Stack>
                  <Box component="pre" sx={{ whiteSpace: 'pre-wrap', mb: 0, fontSize: 12 }}>
                    {prettyJson(event.summary)}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}

          {tab === 3 && clientId && <ClientDeploymentPanel clientId={clientId} />}
        </Box>
      </Drawer>

      <Dialog open={revealed !== null} onClose={() => setRevealed(null)} fullWidth maxWidth="sm">
        <DialogTitle>{revealTitle}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('mobile.device.sensitiveWarning')}
          </Alert>
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflow: 'auto' }}>
            {prettyJson(revealed)}
          </Box>
        </DialogContent>
        <DialogActions>
          <ResponsiveButton onClick={() => setRevealed(null)}>{t('common.close')}</ResponsiveButton>
        </DialogActions>
      </Dialog>

      <Dialog open={token !== null} onClose={() => setToken(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('mobile.device.reportToken')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('mobile.device.tokenOnce')}
          </Alert>
          <TextField
            value={token ?? ''}
            fullWidth
            multiline
            slotProps={{ input: { readOnly: true } }}
          />
        </DialogContent>
        <DialogActions>
          <ResponsiveButton variant="outlined" onClick={() => void copyToken()}>
            {t('common.copy')}
          </ResponsiveButton>
          <ResponsiveButton onClick={() => setToken(null)}>{t('common.close')}</ResponsiveButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
