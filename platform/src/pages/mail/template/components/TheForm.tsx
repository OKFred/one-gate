import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
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
import * as MailTemplateAPI from '@/api/mail/template';
import type { AddMailTemplateReq } from '@/api/mail/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { showSnackbar } from '@/components/Notification';

const DEFAULT_FORM: AddMailTemplateReq = {
  name: '',
  title: '',
  langCode: '',
  content: '',
  category: '',
  isEnabled: true,
};

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开编辑表单 */
  onOpen: (template?: AddMailTemplateReq & { id?: number }) => void;
}

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();
    const t = useTranslation();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddMailTemplateReq>(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: (template?: AddMailTemplateReq & { id?: number }) => {
          if (template) {
            const templateId = template.id;
            setEditId(templateId ?? null);
            setForm({
              name: template.name || '',
              title: template.title || '',
              langCode: template.langCode || '',
              content: template.content || '',
              category: template.category || '',
              isEnabled: template.isEnabled,
            });
          } else {
            setEditId(null);
            setForm(DEFAULT_FORM);
          }
          setOpen(true);
        },
      }),
      [],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        if (editId) {
          await MailTemplateAPI.updateFn({
            data: {
              id: editId,
              ...form,
              langCode: form.langCode || undefined,
              category: form.category,
            },
          });
        } else {
          await MailTemplateAPI.addFn({
            data: {
              ...form,
              langCode: form.langCode!,
              category: form.category || '',
            },
          });
        }
        showSnackbar({
          message: t('mail.send.form.content.loaded'),
          type: 'success',
        });
        handleCancel();
        // 刷新表格数据
        tableRef.current?.refresh();
      } catch (error) {
        console.warn(error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog
        open={open}
        onClose={handleCancel}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {editId ? t('common.actions.update') : t('common.actions.add')}
          </Box>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleCancel} aria-label="close">
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
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  helperText={t('mail.template.form.nameHelp')}
                />
                <TextField
                  label={t('mail.template.form.title')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  helperText={t('mail.template.form.titleHelp')}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('i18n.translation.form.langCode')}
                  value={form.langCode}
                  onChange={(e) => setForm({ ...form, langCode: e.target.value })}
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder={t('form.pleaseEnter')}
                  helperText={t('mail.template.form.langCodeHelp')}
                />
                <TextField
                  label={t('mail.template.form.category')}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder={t('form.pleaseEnter')}
                  helperText={t('mail.template.form.categoryHelp')}
                />
              </Stack>

              <Box>
                <Typography variant="subtitle1" fontWeight={500} mb={1}>
                  {t('mail.template.form.contentLabel')}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {t('mail.template.form.contentHelp')}
                </Typography>
                <JoditEditor
                  value={form.content || ''}
                  onChange={(html) => setForm({ ...form, content: html })}
                  placeholder={t('form.pleaseEnter')}
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
            onClick={handleCancel}
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
            {editId ? t('common.actions.update') : t('common.actions.add')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheForm.displayName = 'TheForm';

export default TheForm;
