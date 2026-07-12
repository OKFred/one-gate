import { useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type ProfileContext } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as ProfileAPI from '@/api/personal/profile';
import type { ListProfileReq, ProfileObj } from '@/api/personal/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { THIS_PERMISSION } from './constant';

export default function ProfileManagement() {
  const extraContext = useMemo<ProfileContext>(() => ({}), []);

  const config = useMemo<SchemaCrudConfig<ProfileObj, FilterState, ListProfileReq, ProfileContext>>(
    () => ({
      apiKeyName: 'id',
      permissions: {
        add: [THIS_PERMISSION?.add],
        edit: [THIS_PERMISSION?.edit],
        delete: [THIS_PERMISSION?.delete],
      },
      api: {
        list: ProfileAPI.listFn,
        add: ProfileAPI.addFn,
        update: ProfileAPI.updateFn,
        delete: ProfileAPI.deleteFn,
      },
      filter: filterConfig,
      table: tableConfig,
      form: formConfig,
    }),
    [],
  );

  return (
    <SchemaCrudPage<ProfileObj, FilterState, ListProfileReq, ProfileContext>
      config={config}
      extraContext={extraContext}
    />
  );
}
