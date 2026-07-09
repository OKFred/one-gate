import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { UserRecord, UserTableContext } from '../index';
import type { ListUserReq } from '@/api/infra/system/type';
import { UserFormFields } from './UserFormFields';

import { FULL_PREFIX } from '../../constant';

export const formConfig: SchemaCrudConfig<
  UserRecord,
  FilterState,
  ListUserReq,
  UserTableContext
>['form'] = {
  schema: `${FULL_PREFIX}.user.add.req`,
  updateSchema: `${FULL_PREFIX}.user.update.req`,
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
