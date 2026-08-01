import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAppVersionReq } from '@/api/admin/mobile/type';

export interface FilterState {
  appId?: number;
  keyword: string;
  orderBy: NonNullable<ListAppVersionReq['orderBy']>;
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
  ListAppVersionReq,
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
