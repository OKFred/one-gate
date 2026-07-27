import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
  CloudQueue as MqttIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  ClearAll as ClearIcon,
  PhoneIphone as MobileIcon,
  Dns as TopicIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import mqtt, { type MqttClient } from 'mqtt';
import { useTranslation } from '@/hooks/useTranslation';
import { showSnackbar } from '@/components/Notification';
import * as MqttAPI from '@/api/admin/mqtt';

export interface MqttLogRow {
  id: number;
  namespace?: string;
  logValue?: {
    traceId?: string;
    topic?: string;
    payload?: unknown;
    qos?: number;
    retain?: boolean;
    direction?: 'IN' | 'OUT';
  };
  createTimeUtc?: number;
  remark?: string;
}

export interface LiveReceivedMessage {
  id: string;
  topic: string;
  payload: string;
  qos: number;
  receivedAt: number;
}

export default function MqttConsolePage() {
  const t = useTranslation();

  // ---------- 发布表单 State ----------
  const [topic, setTopic] = useState('autojs6/tasks');
  const [payload, setPayload] = useState(
    '{\n  "action": "run_script",\n  "script": "console.log(\'Hello from PC Admin Console!\');"\n}',
  );
  const [qos, setQos] = useState<number>(1);
  const [retain, setRetain] = useState(false);
  const [remark, setRemark] = useState('下发移动端指令测试');
  const [publishing, setPublishing] = useState(false);

  // ---------- 实时监听 (Subscriber) State ----------
  const [subTopic, setSubTopic] = useState('#');
  const [isListening, setIsListening] = useState(false);
  const [connectingSub, setConnectingSub] = useState(false);
  const [liveMessages, setLiveMessages] = useState<LiveReceivedMessage[]>([]);
  const mqttClientRef = useRef<MqttClient | null>(null);

  // ---------- 数据库历史日志 State ----------
  const [logs, setLogs] = useState<MqttLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDirection, setFilterDirection] = useState<'IN' | 'OUT' | ''>('');
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);

  // 获取 MQTT 消息历史日志 (base_biz_log)
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await MqttAPI.logsFn({
        data: {
          pageNo: 1,
          pageSize: 50,
          topic: filterTopic || undefined,
          direction: (filterDirection as 'IN' | 'OUT') || undefined,
        },
      });
      if (res?.data?.data?.list) {
        setLogs(res.data.data.list as unknown as MqttLogRow[]);
      }
    } catch {
      // 客户端全局响应拦截器自动提示
    } finally {
      setLoadingLogs(false);
    }
  }, [filterTopic, filterDirection]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 组件卸载时断开 MQTT 客户端
  useEffect(() => {
    return () => {
      if (mqttClientRef.current) {
        try {
          mqttClientRef.current.end(true);
        } catch {}
      }
    };
  }, []);

  // 格式化 JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(payload);
      setPayload(JSON.stringify(parsed, null, 2));
      showSnackbar({ message: t('admin.mqtt.msg.formatSuccess'), type: 'success' });
    } catch {
      showSnackbar({ message: t('admin.mqtt.msg.formatInvalid'), type: 'error' });
    }
  };

  // 快捷发送预设设置
  const applyPreset = (presetType: 'tasks' | 'results' | 'status') => {
    if (presetType === 'tasks') {
      setTopic('autojs6/tasks');
      setPayload(
        JSON.stringify(
          { action: 'run_script', scriptName: 'demo.js', timestamp: Date.now() },
          null,
          2,
        ),
      );
      setRemark('下发 autojs6/tasks 任务指令');
    } else if (presetType === 'results') {
      setTopic('autojs6/results');
      setSubTopic('autojs6/results');
      setPayload(
        JSON.stringify(
          { taskId: 'task_001', success: true, result: 'Script executed successfully' },
          null,
          2,
        ),
      );
    } else if (presetType === 'status') {
      setTopic('autojs6/status');
      setSubTopic('autojs6/status');
      setPayload(
        JSON.stringify(
          { deviceId: 'mobile_35249311637582', status: 'online', battery: 95 },
          null,
          2,
        ),
      );
    }
  };

  // 处理消息发送
  const handlePublish = async () => {
    if (!topic.trim()) {
      showSnackbar({ message: t('admin.mqtt.msg.topicRequired'), type: 'error' });
      return;
    }
    if (!payload.trim()) {
      showSnackbar({ message: t('admin.mqtt.msg.payloadRequired'), type: 'error' });
      return;
    }

    setPublishing(true);
    try {
      await MqttAPI.publishFn({
        data: {
          topic,
          payload,
          qos: qos as 0 | 1 | 2,
          retain,
          remark,
        },
      });
      showSnackbar({ message: t('common.submitSuccess'), type: 'success' });
      fetchLogs();
    } catch {
    } finally {
      setPublishing(false);
    }
  };

  // 开启/关闭在线实时监听
  const toggleListening = async () => {
    if (isListening) {
      if (mqttClientRef.current) {
        try {
          mqttClientRef.current.end(true);
        } catch {}
        mqttClientRef.current = null;
      }
      setIsListening(false);
      showSnackbar({ message: t('admin.mqtt.sub.stopped'), type: 'info' });
      return;
    }

    setConnectingSub(true);
    try {
      const credRes = await MqttAPI.credentialsFn();
      const creds = credRes?.data?.data;
      if (!creds || !creds.brokerUrl) {
        showSnackbar({ message: '获取 MQTT 连接凭证失败', type: 'error' });
        return;
      }

      // 将 raw brokerUrl 转为适合浏览器的 WSS WebSocket 地址
      let wssUrl = creds.brokerUrl;
      try {
        const parsed = new URL(
          creds.brokerUrl.replace('mqtts://', 'https://').replace('mqtt://', 'http://'),
        );
        wssUrl = `wss://${parsed.hostname}:8084/mqtt`;
      } catch {}

      const client = mqtt.connect(wssUrl, {
        clientId: `${creds.clientId}_web_listener_${Math.random().toString(36).substring(2, 7)}`,
        username: creds.username || undefined,
        password: creds.password || undefined,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 5000,
      });

      mqttClientRef.current = client;

      client.on('connect', () => {
        setIsListening(true);
        setConnectingSub(false);
        const targetTopic = subTopic.trim() || '#';
        client.subscribe(targetTopic, (err: Error | null) => {
          if (!err) {
            showSnackbar({
              message: `已成功建立 WebSockets 监听: [${targetTopic}]`,
              type: 'success',
            });
          }
        });
      });

      client.on(
        'message',
        (incomingTopic: string, incomingBuffer: Uint8Array | Buffer, packet: { qos: number }) => {
          const msgStr = incomingBuffer.toString();
          const newMsg: LiveReceivedMessage = {
            id: `live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            topic: incomingTopic,
            payload: msgStr,
            qos: packet.qos,
            receivedAt: Date.now(),
          };

          setLiveMessages((prev) => [newMsg, ...prev.slice(0, 49)]); // 保留最新 50 条
        },
      );

      client.on('error', () => {
        setConnectingSub(false);
      });
    } catch {
      setConnectingSub(false);
    }
  };

  // 复制文本
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showSnackbar({ message: t('admin.mqtt.msg.copied'), type: 'info' });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* 头部 Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MqttIcon sx={{ fontSize: 36, color: 'primary.main', mr: 1.5 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {t('sidebar.menu.mqtt.console')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mqtt.desc')}
          </Typography>
        </Box>
      </Box>

      {/* 快捷预设 Topic 栏 */}
      <Card elevation={0} sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
          >
            <MobileIcon sx={{ fontSize: 18, mr: 0.5 }} />
            {t('admin.mqtt.sub.presets')}:
          </Typography>
          <Chip
            icon={<TopicIcon />}
            label="autojs6/tasks (下发移动端指令)"
            color="primary"
            variant="outlined"
            clickable
            onClick={() => applyPreset('tasks')}
          />
          <Chip
            icon={<TopicIcon />}
            label="autojs6/results (接收移动端结果)"
            color="success"
            variant="outlined"
            clickable
            onClick={() => applyPreset('results')}
          />
          <Chip
            icon={<TopicIcon />}
            label="autojs6/status (接收移动端心跳)"
            color="info"
            variant="outlined"
            clickable
            onClick={() => applyPreset('status')}
          />
        </Stack>
      </Card>

      <Grid container spacing={3}>
        {/* 左侧：发布测试面板 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                {t('admin.mqtt.publish.title')}
              </Typography>

              <TextField
                fullWidth
                label={t('admin.mqtt.publish.topic')}
                placeholder={t('admin.mqtt.publish.topicPlaceholder')}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label={t('admin.mqtt.publish.qos')}
                    value={qos}
                    onChange={(e) => setQos(Number(e.target.value))}
                  >
                    <MenuItem value={0}>QoS 0 (At most once)</MenuItem>
                    <MenuItem value={1}>QoS 1 (At least once)</MenuItem>
                    <MenuItem value={2}>QoS 2 (Exactly once)</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch checked={retain} onChange={(e) => setRetain(e.target.checked)} />
                    }
                    label={t('admin.mqtt.publish.retain')}
                  />
                </Grid>
              </Grid>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {t('admin.mqtt.publish.payload')}
                </Typography>
                <Button size="small" startIcon={<CodeIcon />} onClick={handleFormatJson}>
                  {t('admin.mqtt.publish.formatJson')}
                </Button>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={7}
                placeholder={t('admin.mqtt.publish.payloadPlaceholder')}
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                sx={{
                  mb: 2,
                  fontFamily: 'monospace',
                  '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 13 },
                }}
              />

              <TextField
                fullWidth
                label={t('admin.mqtt.publish.remark')}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={
                  publishing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />
                }
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? t('admin.mqtt.publish.submitting') : t('admin.mqtt.publish.submit')}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：在线实时监听/接收测试面板 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: isListening ? 'success.main' : 'divider',
              bgcolor: 'background.paper',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
                  >
                    {t('admin.mqtt.sub.title')}
                    <Chip
                      size="small"
                      color={isListening ? 'success' : 'default'}
                      label={
                        isListening ? t('admin.mqtt.sub.listening') : t('admin.mqtt.sub.stopped')
                      }
                      sx={{ ml: 1, fontWeight: 'bold' }}
                    />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('admin.mqtt.sub.desc')}
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('admin.mqtt.sub.topic')}
                  value={subTopic}
                  onChange={(e) => setSubTopic(e.target.value)}
                  disabled={isListening}
                />
                <Button
                  variant={isListening ? 'outlined' : 'contained'}
                  color={isListening ? 'error' : 'success'}
                  startIcon={
                    connectingSub ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : isListening ? (
                      <StopIcon />
                    ) : (
                      <StartIcon />
                    )
                  }
                  onClick={toggleListening}
                  disabled={connectingSub}
                  sx={{ minWidth: 130 }}
                >
                  {isListening ? t('admin.mqtt.sub.stop') : t('admin.mqtt.sub.start')}
                </Button>
              </Stack>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  {t('admin.mqtt.sub.receivedCount')}: {liveMessages.length} 条消息
                </Typography>
                <IconButton size="small" onClick={() => setLiveMessages([])}>
                  <Tooltip title={t('admin.mqtt.sub.clear')}>
                    <ClearIcon fontSize="small" />
                  </Tooltip>
                </IconButton>
              </Box>

              {/* 消息瀑布流面板 */}
              <Box
                sx={{
                  height: 320,
                  overflowY: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1.5,
                  bgcolor: 'action.hover',
                }}
              >
                {liveMessages.length === 0 ? (
                  <Box
                    sx={{
                      textCenter: 'center',
                      py: 8,
                      color: 'text.secondary',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2">
                      {isListening
                        ? '⚡ 正在监听 MQTT Broker 消息流，等待移动端 (AutoJS6) 或云端数据推送到站...'
                        : '点击“启动实时监听”按钮开启动态调试'}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {liveMessages.map((msg) => (
                      <Paper
                        key={msg.id}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderLeft: 4,
                          borderColor: 'success.main',
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.5,
                          }}
                        >
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Chip
                              label="IN (接收)"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 20, fontSize: 11 }}
                            />
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                            >
                              {msg.topic}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(msg.receivedAt).format('HH:mm:ss')} (QoS {msg.qos})
                          </Typography>
                        </Box>

                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'grey.900',
                            color: 'common.white',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            overflowX: 'auto',
                          }}
                        >
                          {msg.payload}
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 底部：持久化数据库历史日志 */}
      <Card
        elevation={0}
        sx={{
          mt: 3,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {t('admin.mqtt.log.title')}
            </Typography>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchLogs}
              disabled={loadingLogs}
            >
              {t('common.refresh')}
            </Button>
          </Box>

          {/* 筛选过滤 */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                size="small"
                fullWidth
                label={t('admin.mqtt.log.filterTopic')}
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                select
                size="small"
                fullWidth
                label={t('admin.mqtt.log.colDirection')}
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value as 'IN' | 'OUT' | '')}
              >
                <MenuItem value="">{t('admin.mqtt.log.allDirections')}</MenuItem>
                <MenuItem value="OUT">{t('admin.mqtt.log.directionOut')}</MenuItem>
                <MenuItem value="IN">{t('admin.mqtt.log.directionIn')}</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell width={80}>ID</TableCell>
                  <TableCell width={100}>{t('admin.mqtt.log.colDirection')}</TableCell>
                  <TableCell>{t('admin.mqtt.log.colTopic')}</TableCell>
                  <TableCell width={80}>{t('admin.mqtt.log.colQos')}</TableCell>
                  <TableCell width={180}>{t('admin.mqtt.log.colTime')}</TableCell>
                  <TableCell>{t('admin.mqtt.publish.remark')}</TableCell>
                  <TableCell width={100} align="center">
                    {t('admin.mqtt.log.colPayload')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingLogs ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {t('admin.mqtt.log.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((row) => {
                    const isOut = row.logValue?.direction === 'OUT';
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={isOut ? 'primary' : 'success'}
                            variant="outlined"
                            label={
                              isOut
                                ? t('admin.mqtt.log.directionOut')
                                : t('admin.mqtt.log.directionIn')
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>
                          {row.logValue?.topic || '--'}
                        </TableCell>
                        <TableCell>{row.logValue?.qos ?? '--'}</TableCell>
                        <TableCell>
                          {row.createTimeUtc
                            ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                            : '--'}
                        </TableCell>
                        <TableCell>{row.remark || '--'}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const pStr =
                                typeof row.logValue?.payload === 'object'
                                  ? JSON.stringify(row.logValue.payload, null, 2)
                                  : String(row.logValue?.payload ?? '');
                              setSelectedPayload(pStr);
                            }}
                          >
                            <Tooltip title={t('admin.mqtt.log.viewPayload')}>
                              <CodeIcon fontSize="small" />
                            </Tooltip>
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Payload 详情查看弹窗 */}
      <Dialog
        open={Boolean(selectedPayload)}
        onClose={() => setSelectedPayload(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="h6">{t('admin.mqtt.log.payloadDialogTitle')}</Typography>
          <IconButton
            size="small"
            onClick={() => selectedPayload && handleCopyText(selectedPayload)}
          >
            <CopyIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              borderRadius: 1,
              bgcolor: 'grey.900',
              color: 'common.white',
              fontFamily: 'monospace',
              fontSize: 13,
              overflowX: 'auto',
            }}
          >
            {selectedPayload}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedPayload(null)} variant="contained">
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
