import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  TextField,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import { Send as SendIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import { EnterpriseMailEdmAPI } from '@hodor/ui';

export default function EnterpriseEdmPage() {
  const t = useTranslation();
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    totalSent: number;
    successCount: number;
    failCount: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendBatch = async () => {
    if (!templateId) {
      setErrorMsg(t('mail.edm.error.invalidTemplateId'));
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setResult(null);

    try {
      const res = await EnterpriseMailEdmAPI.sendBatchFn({
        data: {
          templateId: Number(templateId),
          subject: subject || undefined,
        },
      });
      if (res?.data?.data) {
        setResult(res.data.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('mail.edm.error.sendFailed');
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
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
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CampaignIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {t('mail.edm.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('mail.edm.description')}
              </Typography>
            </Box>
          </Stack>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMsg}
            </Alert>
          )}

          {result && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {t('mail.edm.success')}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  label={`${t('mail.edm.totalSent')}: ${result.totalSent}`}
                  size="small"
                  color="default"
                />
                <Chip
                  label={`${t('status.success')}: ${result.successCount}`}
                  size="small"
                  color="success"
                />
                <Chip
                  label={`${t('status.failure')}: ${result.failCount}`}
                  size="small"
                  color="error"
                />
              </Stack>
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              label={t('mail.edm.templateId')}
              type="number"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={t('mail.edm.templateId.placeholder')}
              fullWidth
              required
            />

            <TextField
              label={t('mail.edm.subject')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('mail.edm.subject.placeholder')}
              fullWidth
            />

            <Box sx={{ pt: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={handleSendBatch}
                disabled={loading || !templateId}
                sx={{ px: 4, py: 1.5, borderRadius: 2 }}
              >
                {loading ? t('mail.edm.sending') : t('mail.edm.send')}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
