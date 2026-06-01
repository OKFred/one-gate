import { useState, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import {
  tableConfig,
  type SchemaFormDataItem,
  type SchemaFormDataContext,
} from './components/TheTable';
import TheDetailsDialog from './components/TheDetailsDialog';
import * as SchemaFormDataAPI from '@/api/system/schemaFormData';
import type { ListSchemaFormDataReq } from '@/api/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export default function SchemaFormDataManagement() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<SchemaFormDataItem | null>(null);

  const extraContext = useMemo<SchemaFormDataContext>(
    () => ({
      onShowDetails: (row) => {
        setCurrentRow(row);
        setDetailsOpen(true);
      },
    }),
    [],
  );

  const config: SchemaCrudConfig<
    SchemaFormDataItem,
    FilterState,
    ListSchemaFormDataReq,
    SchemaFormDataContext
  > = {
    titleKey: 'schemaFormData.title',
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: SchemaFormDataAPI.listFn,
      delete: SchemaFormDataAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          formCode: filters.formCode || undefined,
        }) as ListSchemaFormDataReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
      actions: tableConfig.actions,
    },
    form: {
      // 本页面仅为数据展示及删除，故无需表单 schema 和渲染表单，只填空值占位以兼容类型契约
      schema: { type: 'object' },
      defaultForm: {},
    },
  };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />

      <TheDetailsDialog
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setCurrentRow(null);
        }}
        formCode={currentRow?.formCode || ''}
        dataContent={currentRow?.dataContent || ''}
        businessId={currentRow?.businessId || null}
      />
    </>
  );
}
