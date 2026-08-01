/* eslint-disable react-refresh/only-export-components */
import { FULL_PREFIX } from '../constant';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { AddDeviceReq, UpdateDeviceReq } from '@/api/admin/mobile/type';
import { Stack, Switch, FormControlLabel } from '@mui/material';
import { TextField } from '@/components/Form';

export interface DeviceFormFieldsProps {
  form: Partial<AddDeviceReq>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AddDeviceReq>>>;
  isMobile: boolean;
  t: (key: string) => string;
  isEdit?: boolean;
}

export const formConfig: SchemaCrudConfig<
  unknown,
  unknown,
  unknown,
  unknown,
  AddDeviceReq,
  UpdateDeviceReq
>['form'] = {
  schema: `${FULL_PREFIX}.add.req`,
  updateSchema: `${FULL_PREFIX}.update.req`,
  defaultForm: {
    clientId: '',
    deviceName: '',
    isEnabled: true,
    remark: null,
  },
  renderForm: (form, setForm, isMobile, t, isEdit) => (
    <DeviceFormFields
      form={form as Partial<AddDeviceReq>}
      setForm={setForm as React.Dispatch<React.SetStateAction<Partial<AddDeviceReq>>>}
      isMobile={isMobile}
      t={t}
      isEdit={isEdit as boolean}
    />
  ),
};

function DeviceFormFields({ form, setForm, isMobile, t, isEdit }: DeviceFormFieldsProps) {
  const handleFieldChange = (key: keyof AddDeviceReq, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          name="clientId"
          label={t('mobile.device.clientId')}
          value={form.clientId || ''}
          onChange={(e) => handleFieldChange('clientId', e.target.value)}
          required
          disabled={isEdit}
          fullWidth
          size="medium"
        />
        <TextField
          name="deviceName"
          label={t('mobile.device.deviceName')}
          value={form.deviceName || ''}
          onChange={(e) => handleFieldChange('deviceName', e.target.value)}
          fullWidth
          size="medium"
        />
      </Stack>

      <FormControlLabel
        control={
          <Switch
            checked={Boolean(form.isEnabled ?? true)}
            onChange={(e) => handleFieldChange('isEnabled', e.target.checked)}
          />
        }
        label={t('status.enabled')}
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
