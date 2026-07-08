import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type TemplateRes, type TableExtraContext } from './components/TheTable';
import { formConfig } from './components/TheForm';
import ThePreview from './components/ThePreview';
import * as MailTemplateAPI from '@/api/infra/mail/template';
import { THIS_PERMISSION } from '../constant';
import type { ListMailTemplateReq } from '@/api/infra/mail/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export default function MailTemplatePage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<TemplateRes | null>(null);

  const openPreview = (row: TemplateRes) => {
    setPreviewData(row);
    setPreviewOpen(true);
  };

  const extraContext: TableExtraContext = {
    openPreview,
  };

  const config: SchemaCrudConfig<TemplateRes, FilterState, ListMailTemplateReq, TableExtraContext> =
    {
      apiKeyName: 'id',
      permissions: {
        add: [THIS_PERMISSION.template.add],
        edit: [THIS_PERMISSION.template.edit],
        delete: [THIS_PERMISSION.template.delete],
      },
      api: {
        list: MailTemplateAPI.listFn,
        add: MailTemplateAPI.addFn,
        update: MailTemplateAPI.updateFn,
        delete: MailTemplateAPI.deleteFn,
      },
      filter: {
        defaultFilters,
        fields: filterConfig.fields,
        transformRequest: (filters) =>
          ({
            keyword: filters.keyword || undefined,
            orderBy: filters.orderBy,
            descend: filters.descend,
          }) as ListMailTemplateReq,
      },
      table: {
        columns: tableConfig.columns,
        cardFields: tableConfig.cardFields,
        actions: tableConfig.actions,
      },
      form: formConfig,
    };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />
      <ThePreview open={previewOpen} onClose={() => setPreviewOpen(false)} template={previewData} />
    </>
  );
}
