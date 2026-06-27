import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type TranslationRes } from './components/TheTable';
import TranslationFormFields from './components/TheForm';
import * as TranslationAPI from '@/api/i18n/translation';
import type { ListTranslationReq } from '@/api/i18n/type';
import { I18N } from '@/hooks/usePermission';
import translationSchema from '@/assets/schemas/i18n.translationAddReq.json';

const calculateSHA256 = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export default function TranslationPage() {
  const config: SchemaCrudConfig<TranslationRes, FilterState, ListTranslationReq> = {
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
    form: {
      schema: translationSchema,
      defaultForm: {
        application: '',
        business: '',
        langCode: '',
        tKey: '',
        tValue: '',
        valueHash: '',
        isEnabled: true,
        remark: null,
      },
      afterOpen: (form, isEdit, row) => {
        if (isEdit && row) {
          return {
            ...form,
            id: row.id,
            application: row.application || '',
            business: row.business || '',
            langCode: row.langCode || '',
            tKey: row.tKey || '',
            tValue: row.tValue || '',
            valueHash: row.valueHash || '',
            isEnabled: row.isEnabled ?? true,
            remark: row.remark || null,
          };
        }
        return {
          ...form,
          id: undefined,
          application: '',
          business: '',
          langCode: '',
          tKey: '',
          tValue: '',
          valueHash: '',
          isEnabled: true,
          remark: null,
        };
      },
      renderForm: (form, setForm, _errorContextValue, t) => (
        <TranslationFormFields
          form={form as unknown as Parameters<typeof TranslationFormFields>[0]['form']}
          setForm={setForm as unknown as Parameters<typeof TranslationFormFields>[0]['setForm']}
          t={t}
        />
      ),
    },
  };

  return <SchemaCrudPage config={config} />;
}
