import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type TemplateRes, type TableExtraContext } from './components/TheTable';
import TemplateFormFields from './components/TheForm';
import ThePreview from './components/ThePreview';
import schema from '@/assets/schemas/mail.templateAddReq.json';
import * as MailTemplateAPI from '@/api/mail/template';
import { MAIL } from '@/hooks/usePermission';
import type { AddMailTemplateReq, ListMailTemplateReq } from '@/api/mail/type';
import type { SchemaCrudConfig } from '@/components/Crud';

const DEFAULT_FORM: Partial<TemplateRes> = {
  name: '',
  title: '',
  langCode: '',
  content: '',
  category: '',
  isEnabled: true,
  remark: null,
};

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
      titleKey: 'template.title',
      apiKeyName: 'id',
      permissions: {
        add: [MAIL.TEMPLATE.ADD],
        edit: [MAIL.TEMPLATE.EDIT],
        delete: [MAIL.TEMPLATE.DELETE],
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
      form: {
        schema,
        defaultForm: DEFAULT_FORM,
        beforeSubmit: (form, isEdit) => {
          return {
            ...form,
            langCode: form.langCode || (isEdit ? undefined : ''),
            category: form.category || '',
            remark: form.remark ?? null,
          };
        },
        renderForm: (form, setForm, isMobile, t) => (
          <TemplateFormFields
            form={form as Partial<AddMailTemplateReq>}
            setForm={setForm as React.Dispatch<React.SetStateAction<Partial<AddMailTemplateReq>>>}
            isMobile={isMobile}
            t={t}
          />
        ),
      },
    };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />
      <ThePreview open={previewOpen} onClose={() => setPreviewOpen(false)} template={previewData} />
    </>
  );
}
