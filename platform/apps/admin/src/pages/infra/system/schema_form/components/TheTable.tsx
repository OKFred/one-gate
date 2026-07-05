import { Chip } from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListSchemaFormReq, ListSchemaFormRes } from '@/api/infra/system/type';
import type { FilterState } from './TheFilter';

export type SchemaFormItem = NonNullable<ListSchemaFormRes['list']>[0];

export interface SchemaFormContext {
  onPreview: (row: SchemaFormItem) => void;
}

export const tableConfig: SchemaCrudConfig<
  SchemaFormItem,
  FilterState,
  ListSchemaFormReq,
  SchemaFormContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('schemaForm.fields.code'), render: (row) => row.code },
    { title: t('schemaForm.fields.name'), render: (row) => row.name },
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
    { type: 'subtitle', label: t('schemaForm.fields.code'), render: (row) => row.code },
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

  actions: (_t, context) => [
    {
      key: 'preview',
      icon: <VisibilityIcon />,
      color: 'info',
      onClick: (row) => {
        context?.onPreview(row);
      },
    },
  ],
};
