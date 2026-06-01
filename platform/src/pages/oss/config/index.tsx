import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type ConfigRes } from './components/TheTable';
import ConfigFormFields from './components/TheForm';
import schema from '@/assets/schemas/oss.configAddReq.json';
import * as OSSConfigAPI from '@/api/oss/config';
import type { AddConfigReq, ListConfigReq } from '@/api/oss/type';
import type { SchemaCrudConfig } from '@/components/Crud';

const DEFAULT_FORM: Partial<ConfigRes> = {
  name: '',
  provider: 'S3',
  endpoint: '',
  region: 'auto',
  accessKey: '',
  secretKey: '',
  bucket: '',
  accountId: '',
  isDefault: false,
  isEnabled: true,
  remark: '',
};

export default function OSSConfigPage() {
  const config: SchemaCrudConfig<ConfigRes, FilterState, ListConfigReq> = {
    titleKey: 'oss.config.title',
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: OSSConfigAPI.listFn as unknown as SchemaCrudConfig<
        ConfigRes,
        FilterState,
        ListConfigReq
      >['api']['list'],
      add: OSSConfigAPI.addFn as unknown as SchemaCrudConfig<
        ConfigRes,
        FilterState,
        AddConfigReq
      >['api']['add'],
      update: OSSConfigAPI.updateFn as unknown as SchemaCrudConfig<
        ConfigRes,
        FilterState,
        AddConfigReq
      >['api']['update'],
      delete: OSSConfigAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListConfigReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
    },
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      renderForm: (form, setForm, isMobile, t) => (
        <ConfigFormFields
          form={form as Partial<AddConfigReq>}
          setForm={setForm as React.Dispatch<React.SetStateAction<Partial<AddConfigReq>>>}
          isMobile={isMobile}
          t={t}
        />
      ),
    },
  };

  return <SchemaCrudPage config={config} />;
}
