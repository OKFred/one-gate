import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import * as BaseSysConfigAPI from '@/api/admin/base/sys_config';
import type { ConfigRes } from '@/api/admin/base/type';
import { BaseSysConfigFormDialog } from '../../base/sys_config/components/BaseSysConfigFormDialog';

export default function MqttConfigPage() {
  const t = useTranslation();

  // ---------- 配置列表 State ----------
  const [configList, setConfigList] = useState<ConfigRes[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editConfigRow, setEditConfigRow] = useState<ConfigRes | null>(null);

  // 获取 MQTT 配置列表 (namespace = 'mqtt')
  const fetchConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    try {
      const res = await BaseSysConfigAPI.listFn({
        data: {
          pageNo: 1,
          pageSize: 100,
          namespace: 'mqtt',
        },
      });
      if (res?.data?.data?.list) {
        setConfigList(res.data.data.list);
      }
    } catch {
      // 全局拦截器提示
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* 头部 Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ fontSize: 36, color: 'primary.main', mr: 1.5 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {t('sidebar.menu.mqtt.config')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mqtt.config.desc')}
          </Typography>
        </Box>
      </Box>

      <Card
        elevation={0}
        sx={{ borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {t('admin.mqtt.config.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('admin.mqtt.config.desc')}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditConfigRow(null);
                setConfigDialogOpen(true);
              }}
            >
              {t('admin.mqtt.config.create')}
            </Button>
          </Box>

          {loadingConfigs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : configList.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Typography variant="body1">{t('admin.mqtt.config.empty')}</Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => {
                  setEditConfigRow(null);
                  setConfigDialogOpen(true);
                }}
              >
                {t('admin.mqtt.config.createDefault')}
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {configList.map((cfg) => {
                const val = (cfg.configValue || {}) as Record<string, unknown>;
                const isAliyun = val.provider === 'Aliyun';
                const hostStr = String(val.host || '127.0.0.1');
                const portStr = String(val.port || 1883);
                const protoStr = String(val.protocol || 'mqtt');
                const clientStr = String(val.clientId || '-');
                const instanceStr = String(val.instanceId || '-');

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cfg.id}>
                    <Card variant="outlined" sx={{ borderRadius: 2, position: 'relative', p: 1 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {cfg.configKey}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {cfg.isPrimary && (
                              <Chip
                                label={t('admin.mqtt.config.primary')}
                                size="small"
                                color="primary"
                              />
                            )}
                            <Chip
                              label={
                                isAliyun
                                  ? t('admin.mqtt.config.providerAliyun')
                                  : t('admin.mqtt.config.providerEmqx')
                              }
                              size="small"
                              color={isAliyun ? 'warning' : 'info'}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          Host: {hostStr}:{portStr}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          Protocol: {protoStr} | ClientId: {clientStr}
                        </Typography>

                        {isAliyun && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            InstanceId: {instanceStr}
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setEditConfigRow(cfg);
                              setConfigDialogOpen(true);
                            }}
                          >
                            {t('admin.mqtt.config.edit')}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* SysConfig 配置编辑对话框 */}
      {configDialogOpen && (
        <BaseSysConfigFormDialog
          open={configDialogOpen}
          editRow={editConfigRow}
          onClose={() => setConfigDialogOpen(false)}
          onSuccess={() => {
            setConfigDialogOpen(false);
            fetchConfigs();
          }}
        />
      )}
    </Box>
  );
}
