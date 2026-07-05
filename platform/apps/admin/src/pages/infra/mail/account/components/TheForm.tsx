/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { Stack, IconButton } from '@mui/material';
import { TextField } from '@/components/Form';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { AccountRes } from './TheTable';
import type { FilterState } from './TheFilter';
import type { AddMailAccountReq, ListMailAccountReq } from '@/api/infra/mail/type';
import schema from '@/assets/schemas/mail.accountAddReq.json';
import updateSchema from '@/assets/schemas/mail.accountUpdateReq.json';

export interface AccountFormFieldsProps {
  form: Partial<AddMailAccountReq>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AddMailAccountReq>>>;
  isMobile: boolean;
  t: (key: string) => string;
}

export const formConfig: SchemaCrudConfig<AccountRes, FilterState, ListMailAccountReq>['form'] = {
  schema,
  updateSchema,
  defaultForm: {
    nickname: '',
    mailAddress: '',
    host: '',
    port: 465,
    password: '',
    isEnabled: true,
    remark: null,
  },
  beforeSubmit: (form) => {
    const base64Password = form.password ? globalThis.btoa(form.password) : '';
    return {
      ...form,
      password: base64Password,
    };
  },
  renderForm: (form, setForm, isMobile, t) => (
    <AccountFormFields
      form={form as Partial<AddMailAccountReq>}
      setForm={setForm as React.Dispatch<React.SetStateAction<Partial<AddMailAccountReq>>>}
      isMobile={isMobile}
      t={t}
    />
  ),
};

function AccountFormFields({ form, setForm, isMobile, t }: AccountFormFieldsProps) {
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
          name="nickname"
          label={t('account.table.nickname')}
          value={form.nickname || ''}
          onChange={(e) => handleFieldChange('nickname', e.target.value)}
          required
          fullWidth
          size="medium"
        />
        <TextField
          name="mailAddress"
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
          name="host"
          label={t('account.table.host')}
          value={form.host || ''}
          onChange={(e) => handleFieldChange('host', e.target.value)}
          required
          fullWidth
          size="medium"
        />
        <TextField
          name="port"
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
          name="password"
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
        name="remark"
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
