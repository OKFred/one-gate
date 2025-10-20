import React from 'react';
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
import type { MailAccountFormData } from '../type';

interface AccountFormProps {
  open: boolean;
  form: MailAccountFormData;
  editId: number | null;
  onFormChange: (form: MailAccountFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function AccountForm({
  open,
  form,
  editId,
  onFormChange,
  onSubmit,
  onCancel,
}: AccountFormProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
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
        <Box>{editId ? '编辑邮件账户' : '新增邮件账户'}</Box>
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
                label="昵称"
                value={form.nickname}
                onChange={(e) => onFormChange({ ...form, nickname: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
              />
              <TextField
                label="邮箱地址"
                type="email"
                value={form.mailAddress}
                onChange={(e) => onFormChange({ ...form, mailAddress: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="SMTP主机"
                value={form.host}
                onChange={(e) => onFormChange({ ...form, host: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
              />
              <TextField
                label="端口"
                type="number"
                value={form.port}
                onChange={(e) => onFormChange({ ...form, port: e.target.value })}
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
                onChange={(e) => onFormChange({ ...form, password: e.target.value })}
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
                  onFormChange({
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
        <Button onClick={onCancel} fullWidth={isMobile} size={isMobile ? 'large' : 'medium'}>
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
}
