import { useState, useEffect } from 'react';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type RegionRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as RegionAPI from '@/api/i18n/region';
import * as LanguageAPI from '@/api/i18n/language';
import type { ListAllLanguageRes, ListRegionReq } from '@/api/i18n/type';
import { I18N } from '@/hooks/usePermission';

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
      add: [I18N.REGION.ADD],
      edit: [I18N.REGION.EDIT],
      delete: [I18N.REGION.DELETE],
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
