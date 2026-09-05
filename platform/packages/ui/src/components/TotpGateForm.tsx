import { useState } from 'react';
import { Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';

import { totpGateVerifyFn } from '@/api/admin/system/auth';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';

interface TotpGateFormProps {
  readonly onVerified: () => void;
  readonly onLogout: () => Promise<void>;
}

export function TotpGateForm({ onVerified, onLogout }: TotpGateFormProps) {
  const t = useTranslation();
  const [code, setCode] = useState('');
  const [pendingAction, setPendingAction] = useState<'verify' | 'logout' | null>(null);
  const loading = pendingAction !== null;

  const verify = async () => {
    if (loading) return;
    if (!/^\d{6}$/u.test(code)) {
      showSnackbar({ message: t('totpGate.sixDigitRequired'), type: 'error' });
      return;
    }
    setPendingAction('verify');
    try {
      const response = await totpGateVerifyFn({ data: { code } });
      if (response.data.data.verified) onVerified();
    } catch {
      setCode('');
    } finally {
      setPendingAction(null);
    }
  };

  const logout = async () => {
    if (loading) return;
    setPendingAction('logout');
    try {
      await onLogout();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper elevation={4} sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" component="h1" gutterBottom>
              {t('totpGate.title')}
            </Typography>
            <Typography color="text.secondary">{t('totpGate.description')}</Typography>
          </Box>
          <TextField
            autoFocus
            fullWidth
            inputMode="numeric"
            autoComplete="one-time-code"
            label={t('totpGate.code')}
            value={code}
            disabled={loading}
            slotProps={{ htmlInput: { maxLength: 6, pattern: '[0-9]*' } }}
            onChange={(event) => setCode(event.target.value.replace(/\D/gu, '').slice(0, 6))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void verify();
            }}
          />
          <Button
            variant="contained"
            size="large"
            disabled={loading || code.length !== 6}
            startIcon={pendingAction === 'verify' ? <CircularProgress size={18} /> : undefined}
            onClick={() => void verify()}
          >
            {t('totpGate.verify')}
          </Button>
          <Button
            variant="outlined"
            size="large"
            disabled={loading}
            startIcon={pendingAction === 'logout' ? <CircularProgress size={18} /> : undefined}
            onClick={() => void logout()}
          >
            {t('topbar.logout')}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
