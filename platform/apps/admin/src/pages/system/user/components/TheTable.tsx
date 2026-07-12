import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListUserReq, ListUserRes } from '@/api/admin/system/type';
import type { FilterState } from './TheFilter';
import type { UserTableContext } from '../index';

export type UserRes = NonNullable<ListUserRes['list']>[0];

export const tableConfig: SchemaCrudConfig<
  UserRes,
  FilterState,
  ListUserReq,
  UserTableContext
>['table'] = {
  columns: (t, context) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('login.username'), render: (row) => row.username },
    {
      title: t('me.department'),
      render: (row) => context?.getDepartmentName(row.departmentId) || '--',
    },
    {
      title: t('me.role'),
      render: (row) => context?.getRoleNames(row.roleIdArr) || '--',
    },
    {
      title: t('column.language'),
      render: (row) => context?.getLanguageName(row.langCode) || '--',
    },
    {
      title: t('me.region'),
      render: (row) => context?.getRegionName(row.regionId, row.langCode) || '--',
    },
    {
      title: t('columns.status'),
      render: (row) => (
        <Chip
          label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
          color={row.isEnabled ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      title: t('columns.createTime'),
      render: (row) =>
        row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
  ],

  cardFields: (t, context) => [
    { type: 'title', render: (row) => row.username },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    {
      type: 'content',
      label: t('me.department'),
      render: (row) => context?.getDepartmentName(row.departmentId) || '--',
    },
    {
      type: 'content',
      label: t('me.role'),
      render: (row) => context?.getRoleNames(row.roleIdArr) || '--',
    },
    {
      type: 'content',
      label: t('column.language'),
      render: (row) => context?.getLanguageName(row.langCode) || '--',
    },
    {
      type: 'content',
      label: t('me.region'),
      render: (row) => context?.getRegionName(row.regionId, row.langCode) || '--',
    },
    {
      type: 'content',
      label: t('columns.createTime'),
      render: (row) =>
        row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
    {
      type: 'tags',
      render: (row) => (
        <Chip
          label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
          color={row.isEnabled ? 'success' : 'error'}
          size="small"
        />
      ),
    },
  ],
};
