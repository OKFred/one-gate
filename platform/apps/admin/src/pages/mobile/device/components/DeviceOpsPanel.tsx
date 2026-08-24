import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  closeDeviceOpsSession,
  listDeviceOpsAudits,
  openDeviceOpsSession,
  reconnectDeviceOpsSession,
  revealDeviceOpsAudit,
  type DeviceOpsAudit,
  type DeviceOpsTicket,
} from '@/api/admin/mobile/device-ops';
import { showConfirm, showSnackbar } from '@/components/Notification';
import { ResponsiveButton } from '@/components/Responsive';
import { useTranslation } from '@/hooks/useTranslation';

import { THIS_PERMISSION } from '../constant';
import {
  parseDeviceOpsArtifactFrame,
  sha256Hex,
  type DeviceOpsArtifactHeader,
} from './device-ops-artifact';

const AUDIO_STREAMS = [
  'media',
  'ring',
  'notification',
  'alarm',
  'system',
  'voiceCall',
  'bluetoothSco',
  'dtmf',
  'accessibility',
] as const;

type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

interface DeviceOpsPanelProps {
  clientId: string;
}

interface PendingScreenshotArtifact {
  header: DeviceOpsArtifactHeader;
  content: Uint8Array;
}

interface ScreenshotPreview extends DeviceOpsArtifactHeader {
  url: string;
}

/** Parse an untrusted JSON value as a record. */
function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Read the fixed operation list from a capabilities payload. */
function capabilityOperations(value: unknown): string[] | null {
  const capabilities = record(value);
  if (!capabilities) return null;
  if (!Array.isArray(capabilities.operations)) return [];
  return capabilities.operations.filter((item): item is string => typeof item === 'string');
}

/** Send one bounded structured operation request and return its identifier. */
function sendOperation(
  socket: WebSocket,
  ticket: DeviceOpsTicket,
  operation: string,
  params: Record<string, unknown> = {},
): string {
  const createdAt = Date.now();
  const requestId = `req_${crypto.randomUUID().replaceAll('-', '')}`;
  socket.send(
    JSON.stringify({
      protocolVersion: 1,
      type: 'request',
      sessionId: ticket.sessionId,
      requestId,
      operation,
      params,
      createdAt,
      expiresAt: createdAt + 15_000,
    }),
  );
  return requestId;
}

/** Verify that terminal screenshot metadata matches the preceding binary frame. */
function screenshotResultMatches(value: unknown, artifact: PendingScreenshotArtifact): boolean {
  const result = record(value);
  return Boolean(
    result &&
    result.artifactId === artifact.header.artifactId &&
    result.mimeType === artifact.header.mimeType &&
    result.sizeBytes === artifact.header.sizeBytes &&
    result.sha256 === artifact.header.sha256 &&
    result.width === artifact.header.width &&
    result.height === artifact.header.height &&
    result.capturedAt === artifact.header.capturedAt,
  );
}

/** Short-lived structured WSS device operations panel. */
export function DeviceOpsPanel({ clientId }: DeviceOpsPanelProps) {
  const t = useTranslation();
  const socketRef = useRef<WebSocket | null>(null);
  const ticketRef = useRef<DeviceOpsTicket | null>(null);
  const screenshotUrlRef = useRef<string | null>(null);
  const screenshotRequestRef = useRef<string | null>(null);
  const pendingArtifactRef = useRef<PendingScreenshotArtifact | null>(null);
  const pendingScreenshotResponseRef = useRef<Record<string, unknown> | null>(null);
  const screenshotTimeoutRef = useRef<number | null>(null);
  const [ticket, setTicket] = useState<DeviceOpsTicket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [operations, setOperations] = useState<string[] | null>(null);
  const [screenshotPending, setScreenshotPending] = useState(false);
  const [screenshot, setScreenshot] = useState<ScreenshotPreview | null>(null);
  const [stream, setStream] = useState<(typeof AUDIO_STREAMS)[number]>('media');
  const [level, setLevel] = useState('5');
  const [rootId, setRootId] = useState('shared-download');
  const [directory, setDirectory] = useState('');
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [audits, setAudits] = useState<DeviceOpsAudit[]>([]);

  /** Release the current in-browser screenshot without server persistence. */
  const clearScreenshot = useCallback(() => {
    if (screenshotTimeoutRef.current !== null) {
      window.clearTimeout(screenshotTimeoutRef.current);
      screenshotTimeoutRef.current = null;
    }
    if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current);
    screenshotUrlRef.current = null;
    pendingArtifactRef.current = null;
    pendingScreenshotResponseRef.current = null;
    screenshotRequestRef.current = null;
    setScreenshotPending(false);
    setScreenshot(null);
  }, []);

  useEffect(
    () => () => {
      socketRef.current?.close();
      socketRef.current = null;
      ticketRef.current = null;
      if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current);
      screenshotUrlRef.current = null;
      pendingArtifactRef.current = null;
      pendingScreenshotResponseRef.current = null;
      screenshotRequestRef.current = null;
      if (screenshotTimeoutRef.current !== null) {
        window.clearTimeout(screenshotTimeoutRef.current);
        screenshotTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const staleTicket = ticketRef.current;
    if (staleTicket) void closeDeviceOpsSession(staleTicket.sessionId).catch(() => undefined);
    socketRef.current?.close();
    socketRef.current = null;
    ticketRef.current = null;
    setTicket(null);
    setStatus('DISCONNECTED');
    setOperations(null);
    clearScreenshot();
  }, [clientId, clearScreenshot]);

  /** Apply capabilities from hello or the explicit capabilities response. */
  const updateCapabilities = (frame: Record<string, unknown>) => {
    const capabilities =
      frame.type === 'hello'
        ? frame.capabilities
        : frame.type === 'response' &&
            frame.operation === 'device.ops.capabilities' &&
            frame.status === 'SUCCESS'
          ? frame.data
          : null;
    const nextOperations = capabilityOperations(capabilities);
    if (nextOperations !== null) setOperations(nextOperations);
  };

  /** Clear an active screenshot request and show a consistent failure Snackbar. */
  const failScreenshot = (message: string) => {
    if (screenshotTimeoutRef.current !== null) {
      window.clearTimeout(screenshotTimeoutRef.current);
      screenshotTimeoutRef.current = null;
    }
    pendingArtifactRef.current = null;
    pendingScreenshotResponseRef.current = null;
    screenshotRequestRef.current = null;
    setScreenshotPending(false);
    showSnackbar({ message, type: 'error' });
  };

  /** Finalize a screenshot only after metadata and digest verification. */
  const finishScreenshot = async (frame: Record<string, unknown>) => {
    const requestId = typeof frame.requestId === 'string' ? frame.requestId : '';
    if (requestId !== screenshotRequestRef.current) return;
    if (frame.status !== 'SUCCESS') {
      failScreenshot(
        typeof frame.message === 'string' ? frame.message : t('mobile.device.ops.screenshotFailed'),
      );
      return;
    }
    pendingScreenshotResponseRef.current = frame;
    const artifact = pendingArtifactRef.current;
    // The Durable Object audits the binary frame and terminal JSON separately,
    // so either frame can reach the browser first. Keep the successful response
    // until the matching ephemeral artifact arrives within the request window.
    if (!artifact) return;
    if (!screenshotResultMatches(frame.data, artifact)) {
      failScreenshot(t('mobile.device.ops.screenshotInvalid'));
      return;
    }
    let digest: string;
    try {
      digest = await sha256Hex(artifact.content);
    } catch {
      failScreenshot(t('mobile.device.ops.screenshotInvalid'));
      return;
    }
    if (requestId !== screenshotRequestRef.current) return;
    if (digest !== artifact.header.sha256) {
      failScreenshot(t('mobile.device.ops.screenshotInvalid'));
      return;
    }
    let url: string;
    try {
      url = URL.createObjectURL(
        new Blob([Uint8Array.from(artifact.content).buffer], { type: artifact.header.mimeType }),
      );
    } catch {
      failScreenshot(t('mobile.device.ops.screenshotInvalid'));
      return;
    }
    if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current);
    screenshotUrlRef.current = url;
    setScreenshot({ ...artifact.header, url });
    if (screenshotTimeoutRef.current !== null) {
      window.clearTimeout(screenshotTimeoutRef.current);
      screenshotTimeoutRef.current = null;
    }
    pendingArtifactRef.current = null;
    pendingScreenshotResponseRef.current = null;
    screenshotRequestRef.current = null;
    setScreenshotPending(false);
    showSnackbar({ message: t('mobile.device.ops.screenshotReady'), type: 'success' });
  };

  /** Handle one text or binary frame from the operations channel. */
  const handleSocketMessage = async (data: unknown, currentTicket: DeviceOpsTicket) => {
    if (data instanceof ArrayBuffer || data instanceof Blob) {
      try {
        const frame = data instanceof Blob ? await data.arrayBuffer() : data;
        const artifact = parseDeviceOpsArtifactFrame(frame, currentTicket.sessionId);
        if (artifact.header.requestId !== screenshotRequestRef.current) {
          throw new Error('OPS_ARTIFACT_NOT_EXPECTED');
        }
        pendingArtifactRef.current = artifact;
        setLastResult({ ...artifact.header, content: '[ephemeral binary]' });
        const pendingResponse = pendingScreenshotResponseRef.current;
        if (pendingResponse) await finishScreenshot(pendingResponse);
      } catch {
        failScreenshot(t('mobile.device.ops.screenshotInvalid'));
      }
      return;
    }
    try {
      const frame = record(JSON.parse(String(data)));
      if (!frame) throw new Error('OPS_FRAME_INVALID');
      updateCapabilities(frame);
      setLastResult(frame);
      if (frame.type === 'response' && frame.operation === 'device.screen.capture') {
        await finishScreenshot(frame);
      }
    } catch {
      setLastResult({ code: 'OPS_FRAME_INVALID' });
    }
  };

  /** Connect the browser side of a short-lived operations session. */
  const connect = (next: DeviceOpsTicket) => {
    socketRef.current?.close();
    if (screenshotTimeoutRef.current !== null) {
      window.clearTimeout(screenshotTimeoutRef.current);
      screenshotTimeoutRef.current = null;
    }
    pendingArtifactRef.current = null;
    pendingScreenshotResponseRef.current = null;
    screenshotRequestRef.current = null;
    setScreenshotPending(false);
    setStatus('CONNECTING');
    setOperations(null);
    const socket = new WebSocket(next.wsUrl, ['autojs6-ops-v1', `ticket.${next.operatorTicket}`]);
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;
    socket.onopen = () => {
      if (socketRef.current !== socket) return;
      setStatus('CONNECTED');
      sendOperation(socket, next, 'device.ops.capabilities');
    };
    socket.onmessage = (event) => {
      if (socketRef.current === socket) void handleSocketMessage(event.data, next);
    };
    socket.onerror = () => {
      if (socketRef.current === socket) setStatus('DISCONNECTED');
    };
    socket.onclose = () => {
      if (socketRef.current !== socket) return;
      setStatus('DISCONNECTED');
      pendingArtifactRef.current = null;
      pendingScreenshotResponseRef.current = null;
      screenshotRequestRef.current = null;
      if (screenshotTimeoutRef.current !== null) {
        window.clearTimeout(screenshotTimeoutRef.current);
        screenshotTimeoutRef.current = null;
      }
      setScreenshotPending(false);
    };
  };

  /** Open a new device operations session. */
  const open = async () => {
    const response = await openDeviceOpsSession(clientId);
    const next = response.data.data;
    ticketRef.current = next;
    setTicket(next);
    connect(next);
  };

  /** Reissue the one-time operator ticket and reconnect the browser. */
  const reconnect = async () => {
    if (!ticket) return;
    const response = await reconnectDeviceOpsSession(ticket.sessionId);
    const next = response.data.data;
    ticketRef.current = next;
    setTicket(next);
    connect(next);
  };

  /** Close the session and release its ephemeral screenshot. */
  const close = async () => {
    if (!ticket) return;
    await closeDeviceOpsSession(ticket.sessionId);
    socketRef.current?.close();
    socketRef.current = null;
    ticketRef.current = null;
    setStatus('DISCONNECTED');
    setTicket(null);
    setOperations(null);
    clearScreenshot();
  };

  /** Send one operation through the connected WSS. */
  const execute = (operation: string, params: Record<string, unknown> = {}): string | null => {
    const socket = socketRef.current;
    if (!ticket || socket?.readyState !== WebSocket.OPEN) {
      showSnackbar({ message: '运维会话尚未连接', type: 'warning' });
      return null;
    }
    return sendOperation(socket, ticket, operation, params);
  };

  /** Request one screenshot without changing the business task lifecycle. */
  const captureScreenshot = () => {
    if (screenshotPending) return;
    pendingArtifactRef.current = null;
    pendingScreenshotResponseRef.current = null;
    const requestId = execute('device.screen.capture');
    if (!requestId) return;
    screenshotRequestRef.current = requestId;
    setScreenshotPending(true);
    screenshotTimeoutRef.current = window.setTimeout(() => {
      if (screenshotRequestRef.current === requestId) {
        failScreenshot(t('mobile.device.ops.screenshotFailed'));
      }
    }, 15_500);
  };

  /** Download the already verified browser-memory screenshot. */
  const downloadScreenshot = () => {
    if (!screenshot) return;
    const link = document.createElement('a');
    link.href = screenshot.url;
    link.download = `screenshot-${clientId}-${dayjs(screenshot.capturedAt).format(
      'YYYYMMDD-HHmmss',
    )}.png`;
    link.click();
  };

  /** Confirm one state-changing audio operation. */
  const confirmAudio = async (operation: string, params: Record<string, unknown>) => {
    if (
      await showConfirm({
        title: '确认设备操作',
        message: `确定执行 ${operation} (${stream})？`,
        type: 'warning',
      })
    )
      execute(operation, params);
  };

  /** Refresh the last twenty operations audits. */
  const refreshAudits = async () => {
    const response = await listDeviceOpsAudits({ clientId, pageSize: 20 });
    setAudits(response.data.data.list as DeviceOpsAudit[]);
  };

  /** Reveal one encrypted audit through the existing privileged endpoint. */
  const revealAudit = async (id: number) => {
    const response = await revealDeviceOpsAudit(id);
    setLastResult(response.data.data);
  };

  const screenshotSupported = operations?.includes('device.screen.capture') === true;
  const screenshotDisabled = status !== 'CONNECTED' || !screenshotSupported || screenshotPending;
  const screenshotHint =
    operations === null
      ? t('mobile.device.ops.capabilitiesPending')
      : screenshotSupported
        ? ''
        : t('mobile.device.ops.screenshotUnsupported');

  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      <Alert severity="warning">
        运维连接默认 10 分钟，设备主动连接 WSS；仅开放固定操作，不支持 Shell 或终端。
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'center' }}>
        <Chip
          color={
            status === 'CONNECTED' ? 'success' : status === 'CONNECTING' ? 'warning' : 'default'
          }
          label={status}
        />
        {!ticket && (
          <ResponsiveButton permissionCodes={[THIS_PERMISSION.edit]} onClick={() => void open()}>
            开启运维会话
          </ResponsiveButton>
        )}
        {ticket && status !== 'CONNECTED' && (
          <ResponsiveButton
            permissionCodes={[THIS_PERMISSION.edit]}
            onClick={() => void reconnect()}
          >
            重新连接
          </ResponsiveButton>
        )}
        {ticket && (
          <ResponsiveButton
            color="warning"
            permissionCodes={[THIS_PERMISSION.edit]}
            onClick={() => void close()}
          >
            关闭会话
          </ResponsiveButton>
        )}
        {ticket && (
          <Typography variant="caption">
            到期：{dayjs(ticket.expiresAtUtc).format('YYYY-MM-DD HH:mm:ss')}
          </Typography>
        )}
      </Stack>

      <Divider />
      <Typography variant="subtitle1">设备信息</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <ResponsiveButton onClick={() => execute('device.ops.capabilities')}>能力</ResponsiveButton>
        <ResponsiveButton onClick={() => execute('device.foreground.get')}>
          前台应用/页面
        </ResponsiveButton>
        <ResponsiveButton onClick={() => execute('device.network.get')}>网络信息</ResponsiveButton>
        <Tooltip title={screenshotHint}>
          <span>
            <ResponsiveButton disabled={screenshotDisabled} onClick={captureScreenshot}>
              {screenshotPending && <CircularProgress size={16} sx={{ mr: 1 }} />}
              {t('mobile.device.ops.captureScreenshot')}
            </ResponsiveButton>
          </span>
        </Tooltip>
      </Stack>

      {screenshot && (
        <Stack spacing={1}>
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.default',
              p: 1,
              textAlign: 'center',
            }}
          >
            <Box
              component="img"
              src={screenshot.url}
              alt={t('mobile.device.ops.screenshotPreview')}
              sx={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', mx: 'auto' }}
            />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ flex: 1 }}>
              {screenshot.width} × {screenshot.height} · {Math.ceil(screenshot.sizeBytes / 1024)}{' '}
              KiB · {dayjs(screenshot.capturedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Typography>
            <ResponsiveButton onClick={downloadScreenshot}>
              {t('mobile.device.ops.downloadScreenshot')}
            </ResponsiveButton>
          </Stack>
        </Stack>
      )}

      <Divider />
      <Typography variant="subtitle1">音量</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Select value={stream} onChange={(event) => setStream(event.target.value as typeof stream)}>
          {AUDIO_STREAMS.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
        <TextField
          type="number"
          label="绝对音量"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        />
        <ResponsiveButton onClick={() => execute('device.audio.get', { stream })}>
          读取
        </ResponsiveButton>
        <ResponsiveButton
          onClick={() => void confirmAudio('device.audio.set', { stream, level: Number(level) })}
        >
          设置
        </ResponsiveButton>
        <ResponsiveButton onClick={() => void confirmAudio('device.audio.mute', { stream })}>
          静音
        </ResponsiveButton>
        <ResponsiveButton onClick={() => void confirmAudio('device.audio.unmute', { stream })}>
          恢复
        </ResponsiveButton>
      </Stack>

      <Divider />
      <Typography variant="subtitle1">存储与目录</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Select value={rootId} onChange={(event) => setRootId(event.target.value)}>
          {['shared-download', 'camera', 'client-logs', 'client-run'].map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
        <TextField
          fullWidth
          label="相对目录"
          value={directory}
          onChange={(event) => setDirectory(event.target.value)}
        />
        <ResponsiveButton onClick={() => execute('device.storage.stat', { rootId })}>
          存储空间
        </ResponsiveButton>
        <ResponsiveButton
          onClick={() => execute('device.files.list', { rootId, path: directory, pageSize: 100 })}
        >
          获取目录
        </ResponsiveButton>
      </Stack>

      <Box
        component="pre"
        sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, overflow: 'auto', minHeight: 160 }}
      >
        {lastResult ? JSON.stringify(lastResult, null, 2) : '等待运维结果…'}
      </Box>

      <Divider />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle1">运维审计（最近 20 条）</Typography>
        <ResponsiveButton onClick={() => void refreshAudits()}>刷新</ResponsiveButton>
      </Stack>
      <Stack spacing={1}>
        {audits.map((audit) => (
          <Stack
            key={audit.id}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'center' } }}
          >
            <Typography variant="body2" sx={{ flex: 1 }}>
              {dayjs(audit.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')} · {audit.operation} ·{' '}
              {audit.status}
              {audit.resultCode ? ` · ${audit.resultCode}` : ''}
            </Typography>
            <ResponsiveButton
              permissionCodes={[THIS_PERMISSION.read]}
              onClick={() => void revealAudit(audit.id)}
            >
              解密查看
            </ResponsiveButton>
          </Stack>
        ))}
        {audits.length === 0 && <Typography color="text.secondary">暂无已加载审计记录</Typography>}
      </Stack>
    </Stack>
  );
}
