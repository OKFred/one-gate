import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListRegionReq, ListRegionRes } from '@/api/i18n/type';

export type RegionRes = NonNullable<ListRegionRes['list']>[0];

export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListRegionReq['orderBy']>;
  descend: boolean;
  isEnabled?: boolean;
}

export const filterConfig: SchemaCrudConfig<RegionRes, FilterState, ListRegionReq>['filter'] = {
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
        { label: t('region.table.alpha2Code'), value: 'alpha2Code' },
        { label: t('region.table.alpha3Code'), value: 'alpha3Code' },
        { label: t('region.table.numeric'), value: 'numeric' },
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
