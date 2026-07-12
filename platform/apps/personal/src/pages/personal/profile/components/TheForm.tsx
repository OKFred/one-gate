import { Stack, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { TextField } from '@/components/Form';
import type { ProfileObj } from '@/api/personal/type';
import type { SchemaCrudConfig } from '@/components/Crud';

interface ProfileFormFieldsProps {
  form: Partial<ProfileObj>;
  setForm: React.Dispatch<React.SetStateAction<Partial<ProfileObj>>>;
  t: (key: string) => string;
}

export function ProfileFormFields({ form, setForm, t }: ProfileFormFieldsProps) {
  const update = (patch: Partial<ProfileObj>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      <TextField
        name="realName"
        label={t('personal.profile.realName')}
        value={form.realName ?? ''}
        onChange={(e) => update({ realName: e.target.value })}
        required
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel>{t('personal.profile.gender')}</InputLabel>
        <Select
          value={form.gender ?? ''}
          label={t('personal.profile.gender')}
          onChange={(e) => update({ gender: e.target.value || null })}
        >
          <MenuItem value="">-</MenuItem>
          <MenuItem value="male">{t('gender.male')}</MenuItem>
          <MenuItem value="female">{t('gender.female')}</MenuItem>
        </Select>
      </FormControl>
      <TextField
        name="email"
        label={t('personal.profile.email')}
        value={form.email ?? ''}
        onChange={(e) => update({ email: e.target.value || null })}
        fullWidth
      />
      <TextField
        name="phone"
        label={t('personal.profile.phone')}
        value={form.phone ?? ''}
        onChange={(e) => update({ phone: e.target.value || null })}
        fullWidth
      />
      <TextField
        name="remark"
        label={t('personal.profile.remark')}
        value={form.remark ?? ''}
        onChange={(e) => update({ remark: e.target.value || null })}
        fullWidth
        multiline
        rows={3}
      />
    </Stack>
  );
}

export const formConfig: SchemaCrudConfig<ProfileObj, any, any>['form'] = {
  schema: 'personal.profile.add.req',
  defaultForm: {
    userId: undefined,
    realName: '',
    gender: '',
    email: '',
    phone: '',
    remark: '',
  },
  renderForm: (form, setForm, _isMobile, t) => (
    <ProfileFormFields form={form} setForm={setForm} t={t} />
  ),
};
