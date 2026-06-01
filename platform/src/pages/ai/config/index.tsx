import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AiConfigRes } from './components/TheTable';
import AiConfigFormFields from './components/TheForm';
import schema from '@/assets/schemas/ai.configAddReq.json';
import * as AiConfigAPI from '@/api/ai/config';
import type { ListAiConfigReq } from '@/api/ai/type';
import type { SchemaCrudConfig } from '@/components/Crud';

const DEFAULT_FORM: Partial<AiConfigRes> = {
  name: '',
  provider: 'OpenAI',
  baseUrl: '',
  apiKey: '',
  model: '',
  capabilities: '',
  isDefault: false,
  isEnabled: true,
  remark: '',
};

export default function AiConfigManagement() {
  const config: SchemaCrudConfig<AiConfigRes, FilterState, ListAiConfigReq> = {
    titleKey: 'ai.config.title',
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: AiConfigAPI.listFn,
      add: AiConfigAPI.addFn,
      update: AiConfigAPI.updateFn,
      delete: AiConfigAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListAiConfigReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
    },
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      afterOpen: (form, isEdit) => {
        const capabilitiesStr = form.capabilities;
        let parsed: string[] = ['text'];
        if (isEdit && typeof capabilitiesStr === 'string' && capabilitiesStr) {
          try {
            parsed = JSON.parse(capabilitiesStr);
          } catch {
            parsed = [];
          }
        }
        // 将临时的数组存挂在 form 上，以便表单组件中 Select 能够绑定渲染多选
        type ExtendedForm = Partial<AiConfigRes & { _capabilitiesArr?: string[] }>;
        (form as ExtendedForm)._capabilitiesArr = parsed;
        return form;
      },
      beforeSubmit: (form) => {
        type ExtendedForm = Partial<AiConfigRes & { _capabilitiesArr?: string[] }>;
        const updated = { ...form };
        const arr = (updated as ExtendedForm)._capabilitiesArr || [];
        updated.capabilities = JSON.stringify(arr);
        delete (updated as ExtendedForm)._capabilitiesArr;
        return updated;
      },
      renderForm: (form, setForm, _isMobile, t) => (
        <AiConfigFormFields
          form={form}
          setForm={setForm as unknown as Parameters<typeof AiConfigFormFields>[0]['setForm']}
          t={t}
        />
      ),
    },
  };

  return <SchemaCrudPage config={config} />;
}
