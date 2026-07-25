import { FULL_PREFIX, THIS_PERMISSION } from './constant';
import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AiConfigRes, type TableExtraContext } from './components/TheTable';
import AiConfigFormFields from './components/TheForm';
import * as AiConfigAPI from '@/api/admin/ai/config';
import type { ListAiConfigReq } from '@/api/admin/ai/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';

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
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const t = useTranslation();

  // 处理 AI 配置连通性测试
  const handleVerify = async (id: number) => {
    try {
      setVerifyingId(id);
      const res = await AiConfigAPI.verifyFn({ data: { id } });
      if (res.data.data) {
        showSnackbar({ message: t('ai.config.verifySuccess'), type: 'success' });
      } else {
        showSnackbar({ message: t('ai.config.verifyFailed'), type: 'error' });
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const extraContext: TableExtraContext = {
    verifyingId,
    handleVerify,
  };

  const config: SchemaCrudConfig<AiConfigRes, FilterState, ListAiConfigReq, TableExtraContext> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
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
      actions: tableConfig.actions,
    },
    form: {
      schema: `${FULL_PREFIX}.add.req`,
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
        <AiConfigFormFields form={form} setForm={setForm} t={t} />
      ),
    },
  };

  return <SchemaCrudPage config={config} extraContext={extraContext} />;
}
