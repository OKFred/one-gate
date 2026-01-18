import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Box,
  useTheme,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import JoditEditor from '@/components/JoditEditor/index';
import type { AddMailTemplateRequest } from '../type';
import { useResponsive } from '@/hooks/useResponsive';

interface FormData extends AddMailTemplateRequest {
  creatorName?: string;
}

interface TheFormProps {
  open: boolean;
  form: FormData;
  editId: number | null;
  onFormChange: (form: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function TheForm({
  open,
  form,
  editId,
  onFormChange,
  onSubmit,
  onCancel,
  loading = false,
}: TheFormProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const t = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : theme.spacing(2),
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 32px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: isMobile ? 1 : 2,
        }}
      >
        <Box>{editId ? t('mail.template.form.title.edit') : t('mail.template.form.title.add')}</Box>
        {isMobile && (
          <IconButton edge="end" color="inherit" onClick={onCancel} aria-label="close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          pb: isMobile ? 1 : 2,
          px: isMobile ? 2 : 3,
        }}
      >
        <form onSubmit={handleSubmit}>
          <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('mail.template.form.name')}
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                helperText={t('mail.template.form.nameHelp')}
              />
              <TextField
                label={t('mail.template.form.title')}
                value={form.title}
                onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                helperText={t('mail.template.form.titleHelp')}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('mail.template.form.langCode')}
                value={form.langCode}
                onChange={(e) => onFormChange({ ...form, langCode: e.target.value })}
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder={t('mail.template.form.langCodePlaceholder')}
                helperText={t('mail.template.form.langCodeHelp')}
              />
              <TextField
                label={t('mail.template.form.category')}
                value={form.category}
                onChange={(e) => onFormChange({ ...form, category: e.target.value })}
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder={t('mail.template.form.categoryPlaceholder')}
                helperText={t('mail.template.form.categoryHelp')}
              />
            </Stack>

            <TextField
              label={t('mail.template.form.creatorName')}
              value={form.creatorName}
              onChange={(e) => onFormChange({ ...form, creatorName: e.target.value })}
              required
              fullWidth
              size={isMobile ? 'medium' : 'medium'}
              helperText={t('mail.template.form.creatorNameHelp')}
            />

            <Box>
              <Typography variant="subtitle1" fontWeight={500} mb={1}>
                {t('mail.template.form.contentLabel')}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {t('mail.template.form.contentHelp')}
              </Typography>
              <JoditEditor
                value={form.content}
                onChange={(html) => onFormChange({ ...form, content: html })}
                placeholder={t('mail.template.form.contentPlaceholder')}
                height={isMobile ? 300 : 450}
              />
            </Box>
          </Stack>
        </form>
      </DialogContent>

      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? 1 : 0,
        }}
      >
        <Button
          onClick={onCancel}
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          disabled={loading}
        >
          {loading ? t('common.saving') : editId ? t('common.update') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
