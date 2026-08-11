import { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
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
import { showSnackbar } from '@/components/Notification';

export interface DeviceAppDrawerProps {
  open: boolean;
  clientId: string | null;
  onClose: () => void;
}

export function DeviceAppDrawer({ open, clientId, onClose }: DeviceAppDrawerProps) {
  const t = useTranslation();

  // Install dialog state
  const [installOpen, setInstallOpen] = useState(false);
  const [appId, setAppId] = useState('');
  const [versionId, setVersionId] = useState('');

  const defaultCallbackUrl = `${import.meta.env.VITE_SERVER_URL || window.location.origin}/api/v1/admin/mobile/device-app/callback`;
  const [callbackUrl, setCallbackUrl] = useState(defaultCallbackUrl);

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
