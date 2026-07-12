import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListProfileReq, ProfileObj } from '@/api/personal/type';
import type { FilterState } from './TheFilter';

export interface ProfileContext {}

export const tableConfig: SchemaCrudConfig<
  ProfileObj,
  FilterState,
  ListProfileReq,
  ProfileContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('personal.profile.realName'), render: (row) => row.realName },
    {
      title: t('personal.profile.gender'),
      render: (row) => {
        if (row.gender === 'male') return t('gender.male');
        if (row.gender === 'female') return t('gender.female');
        return row.gender || '-';
      },
    },
    { title: t('personal.profile.email'), render: (row) => row.email || '-' },
    { title: t('personal.profile.phone'), render: (row) => row.phone || '-' },
    { title: t('personal.profile.remark'), render: (row) => row.remark || '-' },
    {
      title: t('columns.createTime'),
      render: (row) => (row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.realName },
    { type: 'content', label: t('personal.profile.email'), render: (row) => row.email || '-' },
    { type: 'content', label: t('personal.profile.phone'), render: (row) => row.phone || '-' },
  ],
};
