import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Stack,
  TextField,
  Button,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { MarkEmailRead as EmailIcon } from '@mui/icons-material';
import { PersonalBasePreferenceAPI } from '@hodor/ui';
import { useTranslation } from '@/hooks/useTranslation';

export default function PersonalPreferencePage() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [remoteLoginWarn, setRemoteLoginWarn] = useState(true);
  const [marketingEdm, setMarketingEdm] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPreference();
  }, []);

  const fetchPreference = async () => {
    setLoading(true);
    try {
      const res = await PersonalBasePreferenceAPI.getFn();
      if (res?.data?.data) {
        setEmail(res.data.data.email || '');
        setRemoteLoginWarn(res.data.data.remoteLoginWarn ?? true);
        setMarketingEdm(res.data.data.marketingEdm ?? true);
      }
    } catch {
      // 首次可能为空
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await PersonalBasePreferenceAPI.updateFn({
        data: {
          email,
          remoteLoginWarn,
          marketingEdm,
        },
      });
      setMsg({ type: 'success', text: t('mail.pref.saveSuccess') });
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : t('mail.pref.saveFailed');
      setMsg({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          bgcolor: 'background.paper',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'info.main',
                color: 'info.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <EmailIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {t('mail.pref.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('mail.pref.desc')}
              </Typography>
            </Box>
          </Stack>

          {msg && (
            <Alert severity={msg.type} sx={{ mb: 3 }}>
              {msg.text}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              label={t('mail.pref.emailLabel')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              fullWidth
              helperText={t('mail.pref.emailHelper')}
            />

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {t('mail.pref.securityTitle')}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={remoteLoginWarn}
                    onChange={(e) => setRemoteLoginWarn(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {t('mail.pref.remoteLoginTitle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('mail.pref.remoteLoginDesc')}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {t('mail.pref.marketingTitle')}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={marketingEdm}
                    onChange={(e) => setMarketingEdm(e.target.checked)}
                    color="secondary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {t('mail.pref.edmTitle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('mail.pref.edmDesc')}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Box sx={{ pt: 2 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSave}
                disabled={saving}
                sx={{ px: 4, py: 1.2, borderRadius: 2 }}
              >
                {saving ? t('mail.pref.saving') : t('mail.pref.saveBtn')}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
