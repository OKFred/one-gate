import type { SchemaCrudConfig } from '@/components/Crud';

export interface FilterState {
  keyword: string;
  orderBy: string;
  descend: boolean;
}

export const defaultFilters: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: false,
};

export const filterConfig: SchemaCrudConfig<unknown, FilterState, unknown>['filter'] = {
  defaultFilters,
  fields: (t) => [
    {
      name: 'keyword',
      type: 'text',
      label: t('filter.keyword'),
      placeholder: t('filter.keywordLabel'),
    },
  ],
};
