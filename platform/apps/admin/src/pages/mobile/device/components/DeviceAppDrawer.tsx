import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import * as DeviceAppAPI from '@/api/admin/mobile/device-app';
import type { ListDeviceAppRes } from '@/api/admin/mobile/type';
import dayjs from 'dayjs';
import { showSnackbar } from '@/components/Notification';

export interface DeviceAppDrawerProps {
  open: boolean;
  clientId: string | null;
  onClose: () => void;
}

export function DeviceAppDrawer({ open, clientId, onClose }: DeviceAppDrawerProps) {
  const t = useTranslation();
  const [apps, setApps] = useState<NonNullable<ListDeviceAppRes['list']>>([]);

  // Install dialog state
  const [installOpen, setInstallOpen] = useState(false);
  const [appId, setAppId] = useState('');
  const [versionId, setVersionId] = useState('');

  const defaultCallbackUrl = `${import.meta.env.VITE_SERVER_URL || window.location.origin}/api/v1/admin/mobile/device-app/callback`;
  const [callbackUrl, setCallbackUrl] = useState(defaultCallbackUrl);

  useEffect(() => {
    const loadApps = () => {
      if (open && clientId) {
        DeviceAppAPI.listFn({ data: { clientId, pageNo: 1, pageSize: 100 } })
          .then((res) => {
            setApps(res.data.data.list || []);
          })
          .catch(() => {});
      }
    };
    loadApps();
  }, [open, clientId]);

  const handleSync = async () => {
    if (!clientId) return;
    try {
      await DeviceAppAPI.syncFn({ data: { clientId, callbackUrl } });
      showSnackbar({ message: t('mobile.device.syncSuccess'), type: 'success' });
    } catch {
      // API handler shows error
    }
  };

  const handleInstallSubmit = async () => {
    if (!clientId || !appId || !versionId) return;
    try {
      await DeviceAppAPI.installFn({
        data: {
          clientId,
          appId: Number(appId),
          versionId: Number(versionId),
          callbackUrl,
        },
      });
      showSnackbar({ message: t('mobile.deviceApp.installSuccess'), type: 'success' });
      setInstallOpen(false);
      setAppId('');
      setVersionId('');
    } catch {
      // API handler shows error
    }
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box sx={{ width: 600, p: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
          >
            <Typography variant="h6">
              {t('mobile.deviceApp.title')} - {clientId}
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button variant="outlined" color="primary" onClick={handleSync}>
              {t('mobile.device.actions.sync')}
            </Button>
            <Button variant="contained" color="primary" onClick={() => setInstallOpen(true)}>
              {t('mobile.deviceApp.actions.install')}
            </Button>
          </Box>
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Callback URL (For testing)"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              fullWidth
              size="small"
              helperText="If the device fails to fetch, change localhost to your PC's IP address."
            />
          </Box>
          {apps.map((app) => (
            <Box
              key={app.id}
              sx={{
                mb: 2,
                p: 2,
                border: '1px solid #eee',
                borderRadius: 1,
                display: 'flex',
                gap: 2,
              }}
            >
              {(app as any).appIconUrl ? (
                <img
                  src={(app as any).appIconUrl}
                  alt="icon"
                  style={{ width: 48, height: 48, borderRadius: 8 }}
                />
              ) : (
                <Box sx={{ width: 48, height: 48, bgcolor: 'grey.200', borderRadius: 2 }} />
              )}
              <Box>
                <Typography variant="subtitle1">
                  {(app as any).appName || (app as any).appPackageName || app.appId}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('mobile.deviceApp.installedVersionCode')}: {app.installedVersionCode} (
                  {app.installedVersionName})
                </Typography>
                <Chip label={app.installStatus} size="small" sx={{ mt: 1 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {t('mobile.deviceApp.lastSyncTimeUtc')}:{' '}
                  {app.lastSyncTimeUtc
                    ? dayjs(app.lastSyncTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Drawer>

      <Dialog open={installOpen} onClose={() => setInstallOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('mobile.deviceApp.dialog.installTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="App ID"
              placeholder={t('mobile.deviceApp.dialog.appPlaceholder')}
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              fullWidth
            />
            <TextField
              label="Version ID"
              placeholder={t('mobile.deviceApp.dialog.versionPlaceholder')}
              value={versionId}
              onChange={(e) => setVersionId(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleInstallSubmit} variant="contained" color="primary">
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
