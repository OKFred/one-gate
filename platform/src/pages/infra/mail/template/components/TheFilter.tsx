import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListMailTemplateReq } from '@/api/infra/mail/type';

export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailTemplateReq['orderBy']>;
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
        { label: t('template.table.name'), value: 'name' },
        { label: t('template.table.title'), value: 'title' },
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
