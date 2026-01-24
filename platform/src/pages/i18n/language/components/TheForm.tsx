import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as LanguageAPI from '@/api/i18n/language';
import type { AddLanguageReq } from '@/api/i18n/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开编辑表单 */
  onOpen: (row?: TableState['list'][0]) => void;
}

const DEFAULT_FORM: AddLanguageReq = {
  langCode: '',
  nativeName: '',
  isEnabled: true,
  sortOrder: 1,
  remark: null,
};

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();
    const t = useTranslation();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddLanguageReq>(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: (row?: TableState['list'][0]) => {
          if (row) {
            setEditId(row.id!);
            setForm({
              langCode: row.langCode ?? '',
              nativeName: row.nativeName ?? '',
              isEnabled: row.isEnabled ?? true,
              sortOrder: row.sortOrder ?? 1,
              remark: row.remark ?? null,
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
        const formData = {
          ...form,
        };

        if (editId) {
          await LanguageAPI.updateFn({ data: { id: editId, ...formData } });
        } else {
          await LanguageAPI.addFn({ data: formData });
        }
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
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            margin: isMobile ? 0 : theme.spacing(4),
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
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
                  label={t('i18n.language.form.langCode')}
                  value={form.langCode}
                  onChange={(e) => setForm({ ...form, langCode: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
                <TextField
                  label={t('i18n.language.form.nativeName')}
                  value={form.nativeName}
                  onChange={(e) => setForm({ ...form, nativeName: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('system.menu.form.sort')}
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  inputProps={{ min: 1 }}
                />
              </Stack>
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isEnabled}
                      onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    />
                  }
                  label={t('common.filter.enabledStatus')}
                />
              </Box>
              <TextField
                label={t('common.form.remark')}
                value={form.remark || ''}
                onChange={(e) => setForm({ ...form, remark: e.target.value || null })}
                fullWidth
                multiline
                rows={3}
                size={isMobile ? 'medium' : 'medium'}
                inputProps={{ maxLength: 500 }}
                helperText={`${(form.remark || '').length}/500`}
              />
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
            {t('common.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
