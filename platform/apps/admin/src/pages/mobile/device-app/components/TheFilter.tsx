import type { ListDeviceAppReq } from '@/api/admin/mobile/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export type FilterState = Omit<ListDeviceAppReq, 'pageNo' | 'pageSize' | 'orderBy' | 'descend'>;

export const defaultFilters: FilterState = {};

export const filterConfig: SchemaCrudConfig<
  unknown,
  FilterState,
  ListDeviceAppReq,
  unknown
>['filter'] = {
  defaultFilters,
  fields: (t) => [
    {
      name: 'clientId',
      label: t('mobile.device.clientId'),
      type: 'text',
    },
    {
      name: 'appId',
      label: 'App ID',
      type: 'text',
    },
  ],
  transformRequest: (filters: FilterState) => {
    return {
      keyword: filters.keyword || undefined,
      clientId: filters.clientId || undefined,
      appId: filters.appId ? Number(filters.appId) : undefined,
      installStatus: filters.installStatus || undefined,
    } as ListDeviceAppReq;
  },
};
