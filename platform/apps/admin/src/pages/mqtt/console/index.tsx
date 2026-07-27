import { useState, useEffect, useCallback } from 'react';
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
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
  CloudQueue as MqttIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';
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

export default function MqttConsolePage() {
  const t = useTranslation();

  // ---------- 发布表单 State ----------
  const [topic, setTopic] = useState('sensors/temperature');
  const [payload, setPayload] = useState('{\n  "temperature": 25.5,\n  "humidity": 60\n}');
  const [qos, setQos] = useState<number>(0);
  const [retain, setRetain] = useState(false);
  const [remark, setRemark] = useState('');
  const [publishing, setPublishing] = useState(false);

  // ---------- 日志列表 State ----------
  const [logs, setLogs] = useState<MqttLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDirection, setFilterDirection] = useState<'IN' | 'OUT' | ''>('');
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);

  // ---------- Toast 提示 State ----------
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // 获取 MQTT 消息日志
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
      // 客户端拦截器自动提示
    } finally {
      setLoadingLogs(false);
    }
  }, [filterTopic, filterDirection]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 处理 JSON 格式化
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(payload);
      setPayload(JSON.stringify(parsed, null, 2));
      showToast(t('admin.mqtt.msg.formatSuccess'), 'success');
    } catch {
      showToast(t('admin.mqtt.msg.formatInvalid'), 'error');
    }
  };

  // 处理消息发送
  const handlePublish = async () => {
    if (!topic.trim()) {
      showToast(t('admin.mqtt.msg.topicRequired'), 'error');
      return;
    }
    if (!payload.trim()) {
      showToast(t('admin.mqtt.msg.payloadRequired'), 'error');
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
      showToast(t('common.submitSuccess') || t('common.submit'), 'success');
      fetchLogs();
    } catch {
      // 全局拦截器处理
    } finally {
      setPublishing(false);
    }
  };

  // 复制剪贴板
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t('admin.mqtt.msg.copied'), 'info');
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

      <Grid container spacing={3}>
        {/* 左侧：发布测试面板 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
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
                size="small"
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label={t('admin.mqtt.publish.qos')}
                    value={qos}
                    onChange={(e) => setQos(Number(e.target.value))}
                    size="small"
                  >
                    <MenuItem value={0}>QoS 0</MenuItem>
                    <MenuItem value={1}>QoS 1</MenuItem>
                    <MenuItem value={2}>QoS 2</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={retain}
                        onChange={(e) => setRetain(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={t('admin.mqtt.publish.retain')}
                  />
                </Grid>
              </Grid>

              <Box
                sx={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {t('admin.mqtt.publish.payload')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<CodeIcon />}
                  onClick={handleFormatJson}
                  sx={{ textTransform: 'none' }}
                >
                  {t('admin.mqtt.publish.formatJson')}
                </Button>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder={t('admin.mqtt.publish.payloadPlaceholder')}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  mb: 2,
                }}
              />

              <TextField
                fullWidth
                label={t('admin.mqtt.publish.remark')}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                size="small"
                sx={{ mb: 3 }}
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={
                  publishing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />
                }
                disabled={publishing}
                onClick={handlePublish}
                sx={{
                  py: 1.2,
                  borderRadius: 2,
                  fontWeight: 'bold',
                }}
              >
                {publishing ? t('admin.mqtt.publish.submitting') : t('admin.mqtt.publish.submit')}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：消息流向日志 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {t('admin.mqtt.log.title')}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    placeholder={t('admin.mqtt.log.filterTopic')}
                    size="small"
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    sx={{ width: 160 }}
                  />
                  <TextField
                    select
                    size="small"
                    value={filterDirection}
                    onChange={(e) => setFilterDirection(e.target.value as 'IN' | 'OUT' | '')}
                    sx={{ width: 120 }}
                  >
                    <MenuItem value="">{t('admin.mqtt.log.allDirections')}</MenuItem>
                    <MenuItem value="OUT">{t('admin.mqtt.log.directionOut')}</MenuItem>
                    <MenuItem value="IN">{t('admin.mqtt.log.directionIn')}</MenuItem>
                  </TextField>
                  <IconButton onClick={fetchLogs} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Box>
              </Box>

              {loadingLogs ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : logs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  {t('admin.mqtt.log.empty')}
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell width={70}>{t('admin.mqtt.log.colDirection')}</TableCell>
                        <TableCell>{t('admin.mqtt.log.colTopic')}</TableCell>
                        <TableCell width={70}>{t('admin.mqtt.log.colQos')}</TableCell>
                        <TableCell width={150}>{t('admin.mqtt.log.colTime')}</TableCell>
                        <TableCell width={80} align="center">
                          {t('admin.mqtt.log.colPayload')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.map((row) => {
                        const logValue = row.logValue || {};
                        const isOut = logValue.direction === 'OUT';
                        return (
                          <TableRow key={row.id} hover>
                            <TableCell>
                              <Chip
                                label={
                                  isOut
                                    ? t('admin.mqtt.log.directionOut')
                                    : t('admin.mqtt.log.directionIn')
                                }
                                size="small"
                                color={isOut ? 'primary' : 'success'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                              {logValue.topic || '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`QoS ${logValue.qos ?? 0}`}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                              {row.createTimeUtc
                                ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                                : '-'}
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="text"
                                onClick={() =>
                                  setSelectedPayload(
                                    typeof logValue.payload === 'object'
                                      ? JSON.stringify(logValue.payload, null, 2)
                                      : String(logValue.payload || ''),
                                  )
                                }
                              >
                                {t('admin.mqtt.log.viewPayload')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payload 查看对话框 */}
      <Dialog
        open={Boolean(selectedPayload)}
        onClose={() => setSelectedPayload(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {t('admin.mqtt.log.payloadDialogTitle')}
          {selectedPayload && (
            <IconButton onClick={() => handleCopyText(selectedPayload)}>
              <CopyIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Box
            component="pre"
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            {selectedPayload}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedPayload(null)}>{t('common.cancel')}</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar 全局提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
