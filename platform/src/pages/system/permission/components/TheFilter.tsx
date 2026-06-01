import type { SchemaCrudConfig } from '@/components/Crud';

export interface FilterState {
  keyword: string;
}

export const defaultFilters: FilterState = {
  keyword: '',
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
