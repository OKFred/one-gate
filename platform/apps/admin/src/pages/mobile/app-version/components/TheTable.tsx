import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAppVersionReq, ListAppVersionRes } from '@/api/admin/mobile/type';
import type { FilterState } from './TheFilter';
import { Button } from '@mui/material';

export type AppVersionRes = NonNullable<ListAppVersionRes['list']>[0];

export const tableConfig: SchemaCrudConfig<AppVersionRes, FilterState, ListAppVersionReq>['table'] =
  {
    columns: (t) => [
      { title: t('columns.id'), render: (row) => row.id },
      { title: t('mobile.appVersion.versionCode'), render: (row) => row.versionCode },
      { title: t('mobile.appVersion.versionName'), render: (row) => row.versionName },
      {
        title: t('mobile.appVersion.apkUrl'),
        render: (row) =>
          row.apkUrl ? (
            <Button size="small" href={row.apkUrl} target="_blank" rel="noopener">
              {t('mobile.appVersion.download')}
            </Button>
          ) : (
            '-'
          ),
      },
      {
        title: t('columns.createTime'),
        render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
      },
      { title: t('column.remark'), render: (row) => row.remark || '-' },
    ],
    cardFields: () => [],
    actions: () => [],
  };
