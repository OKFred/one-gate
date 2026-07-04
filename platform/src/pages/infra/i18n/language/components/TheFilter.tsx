import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListLanguageReq, ListLanguageRes } from '@/api/infra/i18n/type';

export type LanguageRes = NonNullable<ListLanguageRes['list']>[0];

export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListLanguageReq['orderBy']>;
  descend: boolean;
  isEnabled?: boolean;
}

export const filterConfig: SchemaCrudConfig<LanguageRes, FilterState, ListLanguageReq>['filter'] = {
  defaultFilters: {
    keyword: '',
    orderBy: 'id',
    descend: false,
    isEnabled: undefined,
  },
  fields: (t) => [
    {
      name: 'keyword',
      type: 'text',
      label: t('filter.keyword'),
      placeholder: t('filter.keywordLabel'),
    },
    {
      name: 'isEnabled',
      type: 'select',
      label: t('filter.enabledStatus'),
      options: [
        { label: t('filter.all'), value: undefined },
        { label: t('status.enabled'), value: true },
        { label: t('status.disabled'), value: false },
      ],
    },
    {
      name: 'orderBy',
      type: 'select',
      label: t('filter.orderBy'),
      options: [
        { label: t('columns.id'), value: 'id' },
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
