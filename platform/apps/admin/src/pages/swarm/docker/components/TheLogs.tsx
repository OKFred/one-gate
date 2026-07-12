import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon, Close as CloseIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import * as DockerAPI from '@/api/admin/swarm/docker';

interface TheLogsProps {
  open: boolean;
  serviceId: string | null;
  serviceName: string | null;
  onClose: () => void;
}

export default function TheLogs({ open, serviceId, serviceName, onClose }: TheLogsProps) {
  const t = useTranslation();
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [tail, setTail] = useState<number>(100);
  const logBottomRef = useRef<HTMLDivElement | null>(null);

  const fetchLogs = useCallback(async (targetId: string, linesCount: number) => {
    setLoading(true);
    try {
      const res = await DockerAPI.getServiceLogsFn({
        data: {
          id: targetId,
          tail: linesCount,
        },
      });
      const content = res.data?.data?.logs || '';
      setLogs(content);
    } catch (error) {
      console.error(error);
      setLogs('');
    } finally {
      setLoading(false);
    }
  }, []);

  // 当打开弹窗、服务 ID 更改或行数下拉值变化时拉取日志
  useEffect(() => {
    if (open && serviceId) {
      fetchLogs(serviceId, tail);
    }
  }, [open, serviceId, tail, fetchLogs]);

  // 日志内容更新时自动滚动到底部
  useEffect(() => {
    if (logBottomRef.current) {
      logBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleRefresh = () => {
    if (serviceId) {
      fetchLogs(serviceId, tail);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#1E1E1E',
            color: '#E0E0E0',
            borderRadius: 2,
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #333333',
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#FFF' }}>
          {t('swarm.docker.logsTitle')} - {serviceName || serviceId}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 日志行数配置 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#888' }}>
              {t('swarm.docker.tailLines')}:
            </Typography>
            <Select
              size="small"
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              sx={{
                color: '#FFF',
                bgcolor: '#2C2C2C',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#444',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#666',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#4CAF50',
                },
                height: 32,
                fontSize: '0.875rem',
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      bgcolor: '#2C2C2C',
                      color: '#FFF',
                    },
                  },
                },
              }}
            >
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={500}>500</MenuItem>
              <MenuItem value={1000}>1000</MenuItem>
            </Select>
          </Box>

          {/* 刷新日志 */}
          <Tooltip title={t('swarm.docker.refresh')}>
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={loading}
                sx={{
                  color: '#4CAF50',
                  '&.Mui-disabled': { color: '#444' },
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>

          {/* 关闭日志 */}
          <IconButton onClick={onClose} sx={{ color: '#888', '&:hover': { color: '#FFF' } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 2,
          flexGrow: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#121212',
          borderBottom: '1px solid #333333',
        }}
      >
        {loading && logs === '' ? (
          <Box
            sx={{
              display: 'flex',
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <CircularProgress size={24} sx={{ color: '#4CAF50' }} />
            <Typography variant="body2" sx={{ color: '#888' }}>
              {t('swarm.docker.loadingLogs')}
            </Typography>
          </Box>
        ) : logs === '' ? (
          <Box
            sx={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Typography variant="body2" sx={{ color: '#666' }}>
              {t('swarm.docker.noLogs')}
            </Typography>
          </Box>
        ) : (
          <Box
            component="pre"
            sx={{
              margin: 0,
              fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: '#A9B7C6',
              flexGrow: 1,
            }}
          >
            {logs}
            <div ref={logBottomRef} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#1E1E1E' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: '#888',
            borderColor: '#444',
            '&:hover': {
              borderColor: '#666',
              bgcolor: '#2C2C2C',
            },
          }}
        >
          {t('swarm.docker.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
