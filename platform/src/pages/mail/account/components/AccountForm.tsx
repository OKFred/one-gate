import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from '@mui/material';

interface FormData {
  nickname: string;
  mailAddress: string;
  host: string;
  port: string;
  accountOwner: string;
  password: string;
  sslEnable: boolean;
  starttlsEnable: boolean;
}

interface AccountFormProps {
  open: boolean;
  form: FormData;
  editId: number | null;
  onFormChange: (form: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function AccountForm({ open, form, editId, onFormChange, onSubmit, onCancel }: AccountFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        {editId ? '编辑邮件账户' : '新增邮件账户'}
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="昵称"
                value={form.nickname}
                onChange={(e) => onFormChange({ ...form, nickname: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="邮箱地址"
                type="email"
                value={form.mailAddress}
                onChange={(e) => onFormChange({ ...form, mailAddress: e.target.value })}
                required
                fullWidth
              />
            </Stack>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="SMTP主机"
                value={form.host}
                onChange={(e) => onFormChange({ ...form, host: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="端口"
                type="number"
                value={form.port}
                onChange={(e) => onFormChange({ ...form, port: e.target.value })}
                required
                fullWidth
              />
            </Stack>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="账户所有者"
                value={form.accountOwner}
                onChange={(e) => onFormChange({ ...form, accountOwner: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="密码"
                type="password"
                value={form.password}
                onChange={(e) => onFormChange({ ...form, password: e.target.value })}
                required
                fullWidth
              />
            </Stack>
          </Stack>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {editId ? '更新' : '新增'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
