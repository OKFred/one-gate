import React from 'react';
import {
  Button,
  Card,
  CardContent,
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
  form: FormData;
  editId: number | null;
  onFormChange: (form: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function AccountForm({ form, editId, onFormChange, onSubmit, onCancel }: AccountFormProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <form onSubmit={onSubmit}>
          <Stack spacing={3}>
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
            
            <Stack direction="row" spacing={2}>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
              >
                {editId ? '更新' : '新增'}
              </Button>
              {editId && (
                <Button
                  type="button"
                  variant="outlined"
                  onClick={onCancel}
                >
                  取消
                </Button>
              )}
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
