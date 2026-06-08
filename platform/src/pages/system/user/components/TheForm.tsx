import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { UserRecord, UserTableContext } from '../index';
import type { ListUserReq } from '@/api/system/type';
import schema from '@/assets/schemas/system.userAddReq.json';
import updateSchema from '@/assets/schemas/system.userUpdateReq.json';
import { UserFormFields } from './UserFormFields';

export const formConfig: SchemaCrudConfig<
  UserRecord,
  FilterState,
  ListUserReq,
  UserTableContext
>['form'] = {
  schema,
  updateSchema,
  defaultForm: {
    username: '',
    password: '',
    langCode: '',
    isEnabled: true,
    remark: null,
  },
  beforeSubmit: (form) => ({
    ...form,
    password: form.password ? globalThis.btoa(form.password) : undefined,
  }),
  renderForm: (form, setForm, _isMobile, t, extraContext) => (
    <UserFormFields
      form={form}
      setForm={setForm}
      enabledRegions={extraContext?.enabledRegions || []}
      enabledLanguages={extraContext?.enabledLanguages || []}
      t={t}
      isEdit={!!form.id}
    />
  ),
};
