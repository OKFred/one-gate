import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  MenuItem,
  Select,
  Stack,
  TextField,
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
import { showSnackbar } from '@/components/Notification';
import { ResponsiveButton } from '@/components/Responsive';

import { THIS_PERMISSION } from '../constant';

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

/** Short-lived structured WSS device operations panel. */
export function DeviceOpsPanel({ clientId }: DeviceOpsPanelProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const [ticket, setTicket] = useState<DeviceOpsTicket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [stream, setStream] = useState<(typeof AUDIO_STREAMS)[number]>('media');
  const [level, setLevel] = useState('5');
  const [rootId, setRootId] = useState('shared-download');
  const [directory, setDirectory] = useState('');
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [audits, setAudits] = useState<DeviceOpsAudit[]>([]);

  useEffect(
    () => () => {
      socketRef.current?.close();
      socketRef.current = null;
    },
    [],
  );

  const connect = (next: DeviceOpsTicket) => {
    socketRef.current?.close();
    setStatus('CONNECTING');
    const socket = new WebSocket(next.wsUrl, ['autojs6-ops-v1', `ticket.${next.operatorTicket}`]);
    socketRef.current = socket;
    socket.onopen = () => setStatus('CONNECTED');
    socket.onmessage = (event) => {
      try {
        setLastResult(JSON.parse(String(event.data)) as unknown);
      } catch {
        setLastResult({ code: 'OPS_FRAME_INVALID' });
      }
    };
    socket.onerror = () => setStatus('DISCONNECTED');
    socket.onclose = () => setStatus('DISCONNECTED');
  };

  const open = async () => {
    const response = await openDeviceOpsSession(clientId);
    const next = response.data.data;
    setTicket(next);
    connect(next);
  };

  const reconnect = async () => {
    if (!ticket) return;
    const response = await reconnectDeviceOpsSession(ticket.sessionId);
    const next = response.data.data;
    setTicket(next);
    connect(next);
  };

  const close = async () => {
    if (!ticket) return;
    await closeDeviceOpsSession(ticket.sessionId);
    socketRef.current?.close();
    socketRef.current = null;
    setStatus('DISCONNECTED');
    setTicket(null);
  };

  const execute = (operation: string, params: Record<string, unknown> = {}) => {
    const socket = socketRef.current;
    if (!ticket || socket?.readyState !== WebSocket.OPEN) {
      showSnackbar({ message: '运维会话尚未连接', type: 'warning' });
      return;
    }
    const createdAt = Date.now();
    socket.send(
      JSON.stringify({
        protocolVersion: 1,
        type: 'request',
        sessionId: ticket.sessionId,
        requestId: `req_${crypto.randomUUID().replaceAll('-', '')}`,
        operation,
        params,
        createdAt,
        expiresAt: createdAt + 15_000,
      }),
    );
  };

  const confirmAudio = (operation: string, params: Record<string, unknown>) => {
    if (window.confirm(`确定执行 ${operation} (${stream})？`)) execute(operation, params);
  };

  const refreshAudits = async () => {
    const response = await listDeviceOpsAudits({ clientId, pageSize: 20 });
    setAudits(response.data.data.list as DeviceOpsAudit[]);
  };

  const revealAudit = async (id: number) => {
    const response = await revealDeviceOpsAudit(id);
    setLastResult(response.data.data);
  };

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
            到期：{new Date(ticket.expiresAtUtc).toLocaleString()}
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
      </Stack>

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
          onClick={() => confirmAudio('device.audio.set', { stream, level: Number(level) })}
        >
          设置
        </ResponsiveButton>
        <ResponsiveButton onClick={() => confirmAudio('device.audio.mute', { stream })}>
          静音
        </ResponsiveButton>
        <ResponsiveButton onClick={() => confirmAudio('device.audio.unmute', { stream })}>
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
              {new Date(audit.createTimeUtc).toLocaleString()} · {audit.operation} · {audit.status}
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
