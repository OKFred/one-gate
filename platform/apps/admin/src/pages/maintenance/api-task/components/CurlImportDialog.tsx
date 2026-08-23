import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import * as ApiTaskAPI from '@/api/admin/maintenance/api-task';
import { parseCurlCommand, type CurlImportErrorCode } from '../curlImport';

interface CurlImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  successCount: number;
  failedCount: number;
  errors: { taskKey: string; message: string }[];
}

interface ParseError {
  code: CurlImportErrorCode;
  detail?: string;
}

export function CurlImportDialog({ open, onClose, onSuccess }: CurlImportDialogProps) {
  const t = useTranslation();
  const [curlText, setCurlText] = useState('');
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<ParseError | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (open) {
      setCurlText('');
      setImporting(false);
      setParseError(null);
      setImportResult(null);
    }
  }, [open]);

  const handleImport = async () => {
    setParseError(null);
    const parsed = parseCurlCommand(curlText);
    if (!parsed.ok) {
      setParseError({ code: parsed.code, detail: parsed.detail });
      return;
    }

    setImporting(true);
    try {
      const response = await ApiTaskAPI.bulkAddFn({ data: { tasks: [parsed.task] } });
      if (response.data?.data) {
        setImportResult(response.data.data);
        if (response.data.data.successCount > 0) onSuccess();
      }
    } catch {
      // HTTP errors are displayed by the shared response interceptor.
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('apiTask.curlImport.title')}</DialogTitle>
      <DialogContent>
        {importResult ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity={importResult.failedCount === 0 ? 'success' : 'warning'}>
              {t('apiTask.import.successPrefix')}
              <strong>{importResult.successCount}</strong>
              {t('apiTask.import.successMiddle')}
              <strong>{importResult.failedCount}</strong>
              {t('apiTask.import.successSuffix')}
            </Alert>
            {importResult.errors.map((error) => (
              <Alert key={`${error.taskKey}-${error.message}`} severity="error">
                <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                  {error.taskKey}
                </Typography>
                <Typography variant="body2">{error.message}</Typography>
              </Alert>
            ))}
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('apiTask.curlImport.description')}
            </Typography>
            <Alert severity="warning">{t('apiTask.curlImport.securityWarning')}</Alert>
            <TextField
              value={curlText}
              onChange={(event) => setCurlText(event.target.value)}
              placeholder={t('apiTask.curlImport.placeholder')}
              multiline
              minRows={12}
              maxRows={20}
              fullWidth
              autoFocus
              slotProps={{
                htmlInput: {
                  spellCheck: false,
                  sx: { fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 },
                },
              }}
            />
            {parseError && (
              <Alert severity="error">
                {t(`apiTask.curlImport.error.${parseError.code}`, {
                  detail: parseError.detail || '',
                })}
              </Alert>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('apiTask.curlImport.supported')}
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {importResult ? (
          <Button onClick={handleClose} variant="contained">
            {t('apiTask.import.done')}
          </Button>
        ) : (
          <>
            <Button disabled={importing} onClick={handleClose} variant="outlined">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !curlText.trim()}
              variant="contained"
              startIcon={importing ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {importing ? t('apiTask.curlImport.importing') : t('apiTask.curlImport.import')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
