import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAppReq } from '@/api/admin/mobile/type';

export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListAppReq['orderBy']>;
  descend: boolean;
}

export const defaultFilters: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: true,
};

export const filterConfig: SchemaCrudConfig<unknown, FilterState, ListAppReq, unknown>['filter'] = {
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
