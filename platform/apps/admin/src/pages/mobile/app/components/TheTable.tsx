import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAppReq, ListAppRes } from '@/api/admin/mobile/type';
import type { FilterState } from './TheFilter';

export type AppRes = NonNullable<ListAppRes['list']>[0];

export const tableConfig: SchemaCrudConfig<AppRes, FilterState, ListAppReq>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('mobile.app.appName'), render: (row) => row.name },
    { title: t('mobile.app.packageName'), render: (row) => row.packageName },
    {
      title: t('columns.createTime'),
      render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
    },
    { title: t('column.remark'), render: (row) => row.remark || '-' },
  ],
  cardFields: () => [],
  actions: () => [],
};
