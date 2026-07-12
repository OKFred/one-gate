import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListMailLogReq } from '@/api/admin/mail/type';

export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailLogReq['orderBy']>;
  descend: boolean;
}

export const defaultFilters: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: true,
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
    {
      name: 'orderBy',
      type: 'select',
      label: t('filter.orderBy'),
      options: [
        { label: t('columns.id'), value: 'id' },
        { label: t('log.table.recipient'), value: 'mailTo' },
        { label: t('log.table.sender'), value: 'mailFrom' },
        { label: t('columns.createTime'), value: 'createTimeUtc' },
      ],
    },
    {
      name: 'descend',
      type: 'select',
      label: t('filter.sortOrder'),
      options: [
        { label: t('filter.asc'), value: false },
        { label: t('filter.desc'), value: true },
      ],
    },
  ],
};
