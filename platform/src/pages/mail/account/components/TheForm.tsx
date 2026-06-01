import { useState } from 'react';
import { TextField, Stack, IconButton } from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import type { Dispatch, SetStateAction } from 'react';
import type { AddMailAccountReq } from '@/api/mail/type';

export interface AccountFormFieldsProps {
  form: Partial<AddMailAccountReq>;
  setForm: Dispatch<SetStateAction<Partial<AddMailAccountReq>>>;
  isMobile: boolean;
  t: (key: string) => string;
}

/**
 * 邮箱账户高内聚表单字段组件（集成密码可见性状态与受控输入）
 */
export default function AccountFormFields({ form, setForm, isMobile, t }: AccountFormFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleFieldChange = (key: keyof AddMailAccountReq, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('account.table.nickname')}
          value={form.nickname || ''}
          onChange={(e) => handleFieldChange('nickname', e.target.value)}
          required
          fullWidth
          size="medium"
        />
        <TextField
          label={t('account.table.email')}
          type="email"
          value={form.mailAddress || ''}
          onChange={(e) => handleFieldChange('mailAddress', e.target.value)}
          required
          fullWidth
          size="medium"
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('account.table.host')}
          value={form.host || ''}
          onChange={(e) => handleFieldChange('host', e.target.value)}
          required
          fullWidth
          size="medium"
        />
        <TextField
          label={t('account.table.port')}
          type="number"
          value={form.port ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            handleFieldChange('port', val === '' ? undefined : Number(val));
          }}
          required
          fullWidth
          size="medium"
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('account.table.password')}
          type={showPassword ? 'text' : 'password'}
          value={form.password || ''}
          onChange={(e) => handleFieldChange('password', e.target.value)}
          required
          fullWidth
          size="medium"
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
        label={t('column.remark')}
        value={form.remark || ''}
        onChange={(e) => handleFieldChange('remark', e.target.value || null)}
        fullWidth
        multiline
        rows={3}
        size="medium"
        slotProps={{ htmlInput: { maxLength: 500 } }}
        helperText={`${(form.remark || '').length}/500`}
      />
    </Stack>
  );
}
