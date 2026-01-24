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
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import * as AccountAPI from '@/api/mail/account';
import type { AddMailAccountReq } from '@/api/mail/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开编辑表单 */
  onOpen: (row?: TableState['list'][0]) => void;
}

const DEFAULT_FORM: AddMailAccountReq = {
  nickname: '',
  mailAddress: '',
  host: '',
  port: 465,
  password: '',
  isEnabled: true,
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
    const [form, setForm] = useState<AddMailAccountReq>(DEFAULT_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: (row?: TableState['list'][0]) => {
          if (row) {
            setEditId(row.id!);
            setForm({
              nickname: row.nickname ?? '',
              mailAddress: row.mailAddress ?? '',
              host: row.host ?? '',
              port: row.port,
              password: row.password ?? '',
              isEnabled: row.isEnabled,
              remark: row.remark ?? null,
            });
          } else {
            setEditId(null);
            setForm(DEFAULT_FORM);
          }
          setShowPassword(false);
          setOpen(true);
        },
      }),
      [],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
      setShowPassword(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const base64Password = globalThis.btoa(form.password); // 防小白
        const formData = {
          ...form,
          password: base64Password,
          port: form.port,
        };

        if (editId) {
          await AccountAPI.updateFn({ data: { id: editId, ...formData } });
        } else {
          await AccountAPI.addFn({ data: formData });
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
                  label={t('mail.account.form.nickname')}
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
                <TextField
                  label={t('mail.account.form.email')}
                  type="email"
                  value={form.mailAddress}
                  onChange={(e) => setForm({ ...form, mailAddress: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('mail.account.form.host')}
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
                <TextField
                  label={t('mail.account.form.port')}
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('mail.account.form.password')}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    },
                  }}
                />
              </Stack>

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
