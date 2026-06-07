import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListCronReq } from '@/api/maintenance/type';

export interface FilterState {
  keyword: string;
  status: 0 | 1 | undefined;
}

export const defaultFilters: FilterState = {
  keyword: '',
  status: undefined,
};

export const filterConfig: SchemaCrudConfig<unknown, FilterState, ListCronReq>['filter'] = {
  defaultFilters,
  fields: (t) => [
    {
      name: 'keyword',
      type: 'text',
      label: t('filter.keyword'),
      placeholder: t('cron.filter.keywordPlaceholder'),
    },
    {
      name: 'status',
      type: 'select',
      label: t('filter.enabledStatus'),
      options: [
        { label: t('filter.all'), value: undefined },
        { label: t('status.enabled'), value: 1 },
        { label: t('status.disabled'), value: 0 },
      ],
    },
  ],
};
