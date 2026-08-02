/* eslint-disable react-refresh/only-export-components */
import { FULL_PREFIX } from '../constant';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { AddAppReq, UpdateAppReq } from '@/api/admin/mobile/type';
import { Stack } from '@mui/material';
import { TextField } from '@/components/Form';

export interface AppFormFieldsProps {
  form: Partial<AddAppReq>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AddAppReq>>>;
  isMobile: boolean;
  t: (key: string) => string;
}

export const formConfig: SchemaCrudConfig<
  unknown,
  unknown,
  unknown,
  unknown,
  AddAppReq,
  UpdateAppReq
>['form'] = {
  schema: `${FULL_PREFIX}.add.req`,
  updateSchema: `${FULL_PREFIX}.update.req`,
  defaultForm: {
    name: '',
    packageName: '',
    remark: null,
  },
  renderForm: (form, setForm, isMobile, t) => (
    <AppFormFields
      form={form as Partial<AddAppReq>}
      setForm={setForm as React.Dispatch<React.SetStateAction<Partial<AddAppReq>>>}
      isMobile={isMobile}
      t={t}
    />
  ),
};

function AppFormFields({ form, setForm, isMobile, t }: AppFormFieldsProps) {
  const handleFieldChange = (key: keyof AddAppReq, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
      <TextField
        name="name"
        label={t('mobile.app.appName')}
        value={form.name || ''}
        onChange={(e) => handleFieldChange('name', e.target.value)}
        required
        fullWidth
        size="medium"
      />
      <TextField
        name="packageName"
        label={t('mobile.app.packageName')}
        value={form.packageName || ''}
        onChange={(e) => handleFieldChange('packageName', e.target.value)}
        required
        fullWidth
        size="medium"
      />
      <TextField
        name="remark"
        label={t('column.remark')}
        value={form.remark || ''}
        onChange={(e) => handleFieldChange('remark', e.target.value || null)}
        fullWidth
        multiline
        rows={3}
        size="medium"
      />
    </Stack>
  );
}
