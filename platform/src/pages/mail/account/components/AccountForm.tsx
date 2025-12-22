import React, { useState, forwardRef, useImperativeHandle, useRef, memo } from 'react';
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
  useMediaQuery,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import * as mailAccountAPI from '@/api/mail/account';
import type { AddMailAccountRequest, ListMailAccount } from '../type';
import type { Props } from '../type.d';

// 暴露给父组件的方法
export interface AccountFormRef {
  /** 打开新增表单 */
  openAdd: () => void;
  /** 打开编辑表单 */
  openEdit: (account: ListMailAccount) => void;
  /** 关闭表单 */
  close: () => void;
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

const AccountForm = memo(
  forwardRef<AccountFormRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // 渲染计数
    const renderCount = useRef(0);
    renderCount.current += 1;

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddMailAccountRequest>(DEFAULT_FORM);
    const [showPassword, setShowPassword] = useState(false);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        openAdd: () => {
          setEditId(null);
          setForm(DEFAULT_FORM);
          setShowPassword(false);
          setOpen(true);
        },
        openEdit: (account: ListMailAccount) => {
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
          setShowPassword(false);
          setOpen(true);
        },
        close: () => {
          handleCancel();
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
            {editId ? '编辑邮件账户' : '新增邮件账户'}
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
                  label="昵称"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
                <TextField
                  label="邮箱地址"
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
                  label="SMTP主机"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                />
                <TextField
                  label="端口"
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
                  label="密码"
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
                  <FormControlLabel value="ssl" control={<Radio />} label="SSL/TLS" />
                  <FormControlLabel value="starttls" control={<Radio />} label="STARTTLS" />
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
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
          >
            {editId ? '更新' : '新增'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

AccountForm.displayName = 'AccountForm';

export default AccountForm;
