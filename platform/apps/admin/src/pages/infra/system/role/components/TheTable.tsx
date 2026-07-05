import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListRoleReq, ListRoleRes } from '@/api/infra/system/type';
import type { FilterState } from './TheFilter';

export type RoleRes = NonNullable<ListRoleRes['list']>[0];

export const tableConfig: SchemaCrudConfig<RoleRes, FilterState, ListRoleReq>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('role.table.roleName'), render: (row) => row.name },
    {
      title: t('role.table.dataScope'),
      render: (row) => {
        const scopeMap: Record<string, string> = {
          all: t('role.dataScope.all'),
          dept_and_below: t('role.dataScope.dept_and_below'),
          custom: t('role.dataScope.custom'),
          self_only: t('role.dataScope.self_only'),
        };
        return scopeMap[row.dataScope || 'self_only'] || row.dataScope;
      },
    },
    {
      title: t('status.enabled'),
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

  cardFields: (t) => [
    { type: 'title', render: (row) => row.name },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    {
      type: 'content',
      label: t('role.table.dataScope'),
      render: (row) => {
        const scopeMap: Record<string, string> = {
          all: t('role.dataScope.all'),
          dept_and_below: t('role.dataScope.dept_and_below'),
          custom: t('role.dataScope.custom'),
          self_only: t('role.dataScope.self_only'),
        };
        return scopeMap[row.dataScope || 'self_only'] || row.dataScope;
      },
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
