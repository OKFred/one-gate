import { THIS_PERMISSION } from './constant';
import { useState, useEffect } from 'react';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type RegionRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as RegionAPI from '@/api/admin/i18n/region';
import * as LanguageAPI from '@/api/admin/i18n/language';
import type { ListAllLanguageRes, ListRegionReq } from '@/api/admin/i18n/type';

export default function RegionPage() {
  const [enabledLanguages, setEnabledLanguages] = useState<ListAllLanguageRes>([]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await LanguageAPI.listAllFn({ data: { isEnabled: true } });
        setEnabledLanguages(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch languages:', error);
      }
    };
    fetchLanguages();
  }, []);

  const config: SchemaCrudConfig<
    RegionRes,
    FilterState,
    ListRegionReq,
    { enabledLanguages: ListAllLanguageRes }
  > = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: RegionAPI.listFn,
      add: RegionAPI.addFn,
      update: RegionAPI.updateFn,
      delete: RegionAPI.deleteFn,
    },
    filter: filterConfig,
    table: tableConfig,
    form: formConfig,
  };

  return <SchemaCrudPage config={config} extraContext={{ enabledLanguages }} />;
}
