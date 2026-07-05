import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListTranslationReq, ListTranslationRes } from '@/api/infra/i18n/type';

export type TranslationRes = NonNullable<ListTranslationRes['list']>[0];

export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListTranslationReq['orderBy']>;
  descend: boolean;
  application?: string;
  business?: string;
  langCode?: string;
  isEnabled?: boolean;
}

export const filterConfig: SchemaCrudConfig<
  TranslationRes,
  FilterState,
  ListTranslationReq
>['filter'] = {
  defaultFilters: {
    keyword: '',
    orderBy: 'id',
    descend: false,
    application: undefined,
    business: undefined,
    langCode: undefined,
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
      name: 'application',
      type: 'text',
      label: t('translation.table.application'),
      placeholder: t('translation.table.application'),
    },
    {
      name: 'business',
      type: 'text',
      label: t('translation.table.business'),
      placeholder: t('translation.table.business'),
    },
    {
      name: 'langCode',
      type: 'text',
      label: t('translation.table.langCode'),
      placeholder: t('translation.table.langCode'),
    },
    {
      name: 'isEnabled',
      type: 'select',
      label: t('status.enabled'),
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
        { label: 'ID', value: 'id' },
        { label: t('translation.table.application'), value: 'application' },
        { label: t('translation.table.business'), value: 'business' },
        { label: t('translation.table.langCode'), value: 'langCode' },
        { label: t('translation.table.tKey'), value: 'tKey' },
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
