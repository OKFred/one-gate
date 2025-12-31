import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Box,
  useTheme,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import * as mailAccountAPI from '@/api/mail/account';
import type { AddMailAccountRequest, ListMailAccount } from '../type';
import type { Props } from '../type';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开编辑表单 */
  onOpen: (account?: ListMailAccount) => void;
}

const DEFAULT_FORM: AddMailAccountRequest = {
  nickname: '',
  mailAddress: '',
  host: '',
  port: 465,
  password: '',
  sslEnable: true,
  starttlsEnable: false,
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
    const [form, setForm] = useState<AddMailAccountRequest>(DEFAULT_FORM);
    const [showPassword, setShowPassword] = useState(false);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: (account?: ListMailAccount) => {
          if (account) {
            setEditId(account.id!);
            setForm({
              nickname: account.nickname || '',
              mailAddress: account.mailAddress || '',
              host: account.host || '',
              port: account.port,
              password: account.password || '',
              sslEnable: account.sslEnable,
              starttlsEnable: account.starttlsEnable,
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
      const formData = {
        ...form,
        port: form.port,
      };

      if (editId) {
        await mailAccountAPI.updateFn({ data: { id: editId, ...formData } });
      } else {
        await mailAccountAPI.addFn({ data: formData });
      }
      handleCancel();
      // 刷新表格数据
      tableRef.current?.refresh();
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
            {editId ? t('i18n.pages.mail.account.form.title.edit') : t('i18n.pages.mail.account.form.title.add')}
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
                  label={t('i18n.pages.mail.account.form.nickname')}
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
                <TextField
                  label={t('i18n.pages.mail.account.form.email')}
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
                  label={t('i18n.pages.mail.account.form.host')}
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
                <TextField
                  label={t('i18n.pages.mail.account.form.port')}
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
                  label={t('i18n.pages.mail.account.form.password')}
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

              <FormControl component="fieldset">
                <FormLabel component="legend">加密方式</FormLabel>
                <RadioGroup
                  row
                  value={form.sslEnable ? 'ssl' : form.starttlsEnable ? 'starttls' : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm({
                      ...form,
                      sslEnable: value === 'ssl',
                      starttlsEnable: value === 'starttls',
                    });
                  }}
                >
                  <FormControlLabel value="ssl" control={<Radio />} label={t('i18n.pages.mail.account.form.ssl')} />
                  <FormControlLabel value="starttls" control={<Radio />} label={t('i18n.pages.mail.account.form.starttls')} />
                </RadioGroup>
              </FormControl>
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
          <Button onClick={handleCancel} fullWidth={isMobile} size={isMobile ? 'large' : 'medium'}>
            {t('i18n.pages.mail.account.form.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
          >
            {t('i18n.pages.mail.account.form.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
