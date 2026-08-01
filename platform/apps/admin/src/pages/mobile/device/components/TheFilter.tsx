import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListDeviceReq } from '@/api/admin/mobile/type';

export interface FilterState {
  keyword: string;
  orderBy: ListDeviceReq['orderBy'];
  descend: boolean;
}

export const defaultFilters: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: true,
};

export const filterConfig: SchemaCrudConfig<
  unknown,
  FilterState,
  ListDeviceReq,
  unknown
>['filter'] = {
  defaultFilters,
  fields: (t) => [
    {
      name: 'keyword',
      type: 'text',
      label: t('column.keyword'),
      placeholder: t('common.searchPlaceholder'),
    },
  ],
};
