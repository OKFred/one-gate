import { Visibility as VisibilityIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListSchemaFormDataReq, ListSchemaFormDataRes } from '@/api/infra/system/type';
import type { FilterState } from './TheFilter';

export type SchemaFormDataItem = NonNullable<ListSchemaFormDataRes['list']>[0];

export interface SchemaFormDataContext {
  onShowDetails: (row: SchemaFormDataItem) => void;
}

export const tableConfig: SchemaCrudConfig<
  SchemaFormDataItem,
  FilterState,
  ListSchemaFormDataReq,
  SchemaFormDataContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('schemaFormData.filter.formCode'), render: (row) => row.formCode },
    { title: t('schemaFormData.filter.businessId'), render: (row) => row.businessId },
    {
      title: t('schemaFormData.dataContent'),
      render: (row) => {
        const text = row.dataContent || '';
        return text.length > 50 ? `${text.slice(0, 50)}...` : text;
      },
    },
    {
      title: t('columns.createTime'),
      render: (row) =>
        row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => `${row.formCode} (Biz ID: ${row.businessId})` },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    {
      type: 'content',
      label: t('schemaFormData.dataContent'),
      render: (row) => {
        const text = row.dataContent || '';
        return text.length > 50 ? `${text.slice(0, 50)}...` : text;
      },
    },
  ],

  actions: (_t, context) => [
    {
      key: 'details',
      icon: <VisibilityIcon />,
      color: 'info',
      onClick: (row) => {
        context?.onShowDetails(row);
      },
    },
  ],
};
