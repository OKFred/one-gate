import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { DockerServiceObj } from '@/api/infra/swarm/type';
import * as DockerAPI from '@/api/infra/swarm/docker';

export interface TheDetailProps {
  open: boolean;
  onClose: () => void;
  service: DockerServiceObj | null;
}

interface ServiceMetricItem {
  taskId: string;
  containerId: string;
  nodeId: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
  blkRead: number;
  blkWrite: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function TheDetail({ open, onClose, service }: TheDetailProps) {
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [metrics, setMetrics] = useState<ServiceMetricItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchMetrics = useCallback(async (targetId: string) => {
    setLoading(true);
    try {
      const res = await DockerAPI.getServiceStatsFn({
        data: {
          id: targetId,
        },
      });
      const data = (res.data?.data || []) as unknown as ServiceMetricItem[];
      setMetrics(data);
    } catch (error) {
      console.error(error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 每次打开弹窗或切换服务时，默认重置为基本信息页签，并清空历史指标
  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setMetrics([]);
    }
  }, [open, service]);

  // 当切换至运行负载页签时自动加载容器实时硬件指标
  useEffect(() => {
    if (open && activeTab === 1 && service?.ID) {
      fetchMetrics(service.ID);
    }
  }, [open, activeTab, service, fetchMetrics]);

  if (!service) return null;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getProgressColor = (value: number) => {
    if (value > 80) return 'error';
    if (value > 50) return 'warning';
    return 'success';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" component="span" sx={{ fontWeight: 'bold' }}>
          {t('swarm.docker.detailTitle')}: {service.Spec?.Name || service.ID}
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ minHeight: 36 }}>
            <Tab label={t('swarm.docker.basicInfo')} sx={{ py: 1, minHeight: 36 }} />
            <Tab label={t('swarm.docker.metrics')} sx={{ py: 1, minHeight: 36 }} />
          </Tabs>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {activeTab === 0 ? (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('swarm.docker.basicInfo')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, pl: 1 }}>
                <Typography variant="body2">
                  <strong>{t('swarm.docker.id')}:</strong> {service.ID}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('swarm.docker.image')}:</strong>{' '}
                  {service.Spec?.TaskTemplate?.ContainerSpec?.Image || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('swarm.docker.version')}:</strong> {service.Version?.Index ?? '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('swarm.docker.replicas')}:</strong>{' '}
                  {service.Spec?.Mode?.Replicated?.Replicas ?? t('swarm.docker.globalMode')}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('swarm.docker.createdAt')}:</strong>{' '}
                  {service.CreatedAt ? new Date(service.CreatedAt).toLocaleString() : '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('swarm.docker.updatedAt')}:</strong>{' '}
                  {service.UpdatedAt ? new Date(service.UpdatedAt).toLocaleString() : '-'}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('swarm.docker.ports')}
              </Typography>
              <Box sx={{ pl: 1 }}>
                {!service.Spec?.EndpointSpec?.Ports ||
                service.Spec.EndpointSpec.Ports.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {t('swarm.docker.noPorts')}
                  </Typography>
                ) : (
                  service.Spec.EndpointSpec.Ports.map((p, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        mr: 2,
                        mb: 1,
                        backgroundColor: 'action.hover',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.875rem',
                      }}
                    >
                      <strong style={{ color: '#1976d2' }}>{p.PublishedPort}</strong>
                      <span style={{ margin: '0 8px', color: '#9e9e9e' }}>➔</span>
                      <strong>{p.TargetPort}</strong>
                      <span
                        style={{
                          marginLeft: 8,
                          color: '#757575',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                        }}
                      >
                        ({p.Protocol || 'tcp'})
                      </span>
                    </Box>
                  ))
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t('swarm.docker.rawConfig')}
              </Typography>
              <Box
                component="pre"
                sx={{
                  backgroundColor: 'grey.900',
                  color: 'common.white',
                  p: 2,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  overflow: 'auto',
                  maxHeight: 300,
                }}
              >
                {JSON.stringify(service, null, 2)}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                {t('swarm.docker.metrics')}
              </Typography>
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => service?.ID && fetchMetrics(service.ID)}
                disabled={loading}
                variant="outlined"
              >
                {t('swarm.docker.refresh')}
              </Button>
            </Box>

            {loading && metrics.length === 0 ? (
              <Box
                sx={{
                  py: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary">
                  {t('swarm.docker.loadingMetrics')}
                </Typography>
              </Box>
            ) : metrics.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {t('swarm.docker.noMetrics')}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {metrics.map((item, index) => (
                  <Grid size={12} key={item.taskId || index}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                        <Typography
                          variant="subtitle2"
                          gutterBottom
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontWeight: 'bold',
                          }}
                        >
                          <span>
                            {t('swarm.docker.taskId')}: {item.taskId.slice(0, 10)}...
                          </span>
                          <span
                            style={{ fontSize: '0.75rem', color: '#9e9e9e', fontWeight: 'normal' }}
                          >
                            ID: {item.containerId.slice(0, 12)} (Node: {item.nodeId})
                          </span>
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 3,
                            mt: 2,
                          }}
                        >
                          {/* CPU 进度 */}
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {t('swarm.docker.cpuUsage')}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 'bold' }}
                              >
                                {item.cpuPercent}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(item.cpuPercent, 100)}
                              color={getProgressColor(item.cpuPercent)}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>

                          {/* 内存 进度 */}
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {t('swarm.docker.memUsage')}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 'bold' }}
                              >
                                {formatBytes(item.memoryUsage)} /{' '}
                                {item.memoryLimit > 0 ? formatBytes(item.memoryLimit) : '-'} (
                                {item.memoryPercent}%)
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(item.memoryPercent, 100)}
                              color={getProgressColor(item.memoryPercent)}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 3,
                            mt: 2,
                          }}
                        >
                          {/* 网络吞吐 */}
                          <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.secondary' }}
                            >
                              {t('swarm.docker.netTraffic')}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ display: 'block' }}
                              color="text.secondary"
                            >
                              <strong>{t('swarm.docker.rx')}:</strong> {formatBytes(item.networkRx)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ display: 'block' }}
                              color="text.secondary"
                            >
                              <strong>{t('swarm.docker.tx')}:</strong> {formatBytes(item.networkTx)}
                            </Typography>
                          </Box>

                          {/* 磁盘 IO */}
                          <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 'bold', mb: 0.5, color: 'text.secondary' }}
                            >
                              {t('swarm.docker.diskIO')}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ display: 'block' }}
                              color="text.secondary"
                            >
                              <strong>{t('swarm.docker.read')}:</strong> {formatBytes(item.blkRead)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ display: 'block' }}
                              color="text.secondary"
                            >
                              <strong>{t('swarm.docker.write')}:</strong>{' '}
                              {formatBytes(item.blkWrite)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">
          {t('swarm.docker.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
