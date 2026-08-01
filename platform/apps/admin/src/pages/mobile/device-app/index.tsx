import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type DeviceAppRes } from './components/TheTable';
import * as DeviceAppAPI from '@/api/admin/mobile/device-app';
import type { ListDeviceAppReq } from '@/api/admin/mobile/type';

export default function MobileDeviceAppPage() {
  const config: SchemaCrudConfig<DeviceAppRes, FilterState, ListDeviceAppReq, unknown> = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: DeviceAppAPI.listFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: filterConfig.transformRequest,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: () => [],
      actions: tableConfig.actions,
    },
    form: {
      schema: {},
      defaultForm: {} as unknown as DeviceAppRes,
      renderForm: () => null,
    },
  };

  return <SchemaCrudPage config={config} />;
}
