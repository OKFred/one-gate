import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type TranslationRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as TranslationAPI from '@/api/i18n/translation';
import type { ListTranslationReq } from '@/api/i18n/type';
import { I18N } from '@/hooks/usePermission';

const calculateSHA256 = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export default function TranslationPage() {
  const config: SchemaCrudConfig<TranslationRes, FilterState, ListTranslationReq> = {
    titleKey: 'translation.title',
    apiKeyName: 'id',
    permissions: {
      add: [I18N.TRANSLATION.ADD],
      edit: [I18N.TRANSLATION.EDIT],
      delete: [I18N.TRANSLATION.DELETE],
    },
    api: {
      list: TranslationAPI.listFn,
      add: async (args) => {
        const hash = await calculateSHA256(args.data.tValue || '');
        return TranslationAPI.addFn({
          data: {
            ...args.data,
            valueHash: hash,
          },
        });
      },
      update: async (args) => {
        const hash = await calculateSHA256(args.data.tValue || '');
        return TranslationAPI.updateFn({
          data: {
            ...args.data,
            valueHash: hash,
          },
        });
      },
      delete: TranslationAPI.deleteFn,
    },
    filter: filterConfig,
    table: tableConfig,
    form: formConfig,
  };

  return <SchemaCrudPage config={config} />;
}
