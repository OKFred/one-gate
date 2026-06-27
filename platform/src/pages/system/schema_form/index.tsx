import { useState, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type SchemaFormItem, type SchemaFormContext } from './components/TheTable';
import SchemaFormFields from './components/TheForm';
import ThePreviewDialog from './components/ThePreviewDialog';
import schema from '@/assets/schemas/system.schema_formAddReq.json';
import * as SchemaFormAPI from '@/api/system/schemaForm';
import type { ListSchemaFormReq } from '@/api/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';

const DEFAULT_FORM: Partial<SchemaFormItem> = {
  code: '',
  name: '',
  schemaData: '',
  uiSchemaData: null,
  remark: null,
  isEnabled: true,
};

export default function SchemaFormManagement() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<SchemaFormItem | null>(null);

  const extraContext = useMemo<SchemaFormContext>(
    () => ({
      onPreview: (row) => {
        setPreviewRow(row);
        setPreviewOpen(true);
      },
    }),
    [],
  );

  const config: SchemaCrudConfig<
    SchemaFormItem,
    FilterState,
    ListSchemaFormReq,
    SchemaFormContext
  > = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: SchemaFormAPI.listFn,
      add: SchemaFormAPI.addFn,
      update: SchemaFormAPI.updateFn,
      delete: SchemaFormAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListSchemaFormReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
      actions: tableConfig.actions,
    },
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      beforeSubmit: (form) => {
        // 在提交前对输入的 schemaData / uiSchemaData 做 JSON 合法性强校验
        if (form.schemaData) {
          try {
            JSON.parse(form.schemaData);
          } catch {
            throw new Error('schemaForm.errors.invalidJson');
          }
        }
        if (form.uiSchemaData) {
          try {
            JSON.parse(form.uiSchemaData);
          } catch {
            throw new Error('schemaForm.errors.invalidUiObject');
          }
        }
        return form;
      },
      renderForm: (form, setForm, _isMobile, t) => (
        <SchemaFormFields form={form} setForm={setForm} t={t} />
      ),
    },
  };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />

      <ThePreviewDialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewRow(null);
        }}
        formCode={previewRow?.code || ''}
        schemaJson={previewRow?.schemaData || ''}
      />
    </>
  );
}
