/* eslint-disable react-refresh/only-export-components */
import { FULL_PREFIX } from '../constant';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { AddAppVersionReq, UpdateAppVersionReq } from '@/api/admin/mobile/type';
import { Stack } from '@mui/material';
import { TextField } from '@/components/Form';

export interface AppVersionFormFieldsProps {
  form: Partial<AddAppVersionReq>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AddAppVersionReq>>>;
  isMobile: boolean;
  t: (key: string) => string;
}

export const formConfig: SchemaCrudConfig<
  unknown,
  unknown,
  unknown,
  unknown,
  AddAppVersionReq,
  UpdateAppVersionReq
>['form'] = {
  schema: `${FULL_PREFIX}.add.req`,
  updateSchema: `${FULL_PREFIX}.update.req`,
  defaultForm: {
    appId: 0,
    versionCode: 0,
    versionName: '',
    apkUrl: '',
    releaseNotes: null,
    remark: null,
  },
  renderForm: (form, setForm, isMobile, t) => (
    <AppVersionFormFields
      form={form as Partial<AddAppVersionReq>}
      setForm={setForm as React.Dispatch<React.SetStateAction<Partial<AddAppVersionReq>>>}
      isMobile={isMobile}
      t={t}
    />
  ),
};

function AppVersionFormFields({ form, setForm, isMobile, t }: AppVersionFormFieldsProps) {
  const handleFieldChange = (key: keyof AddAppVersionReq, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          name="versionCode"
          label={t('mobile.appVersion.versionCode')}
          type="number"
          value={form.versionCode ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            handleFieldChange('versionCode', val === '' ? undefined : Number(val));
          }}
          required
          fullWidth
          size="medium"
        />
        <TextField
          name="versionName"
          label={t('mobile.appVersion.versionName')}
          value={form.versionName || ''}
          onChange={(e) => handleFieldChange('versionName', e.target.value)}
          required
          fullWidth
          size="medium"
        />
      </Stack>
      <TextField
        name="apkUrl"
        label={t('mobile.appVersion.apkUrl')}
        value={form.apkUrl || ''}
        onChange={(e) => handleFieldChange('apkUrl', e.target.value)}
        required
        fullWidth
        size="medium"
      />
      <TextField
        name="releaseNotes"
        label={t('mobile.appVersion.releaseNotes')}
        value={form.releaseNotes || ''}
        onChange={(e) => handleFieldChange('releaseNotes', e.target.value || null)}
        fullWidth
        multiline
        rows={3}
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
