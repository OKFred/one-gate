import type { SchemaCrudConfig } from '@/components/Crud';

export interface FilterState {
  formCode: string;
  businessId: number | null;
}

export const defaultFilters: FilterState = {
  formCode: '',
  businessId: null,
};

export const filterConfig: SchemaCrudConfig<unknown, FilterState, unknown>['filter'] = {
  defaultFilters,
  fields: (t) => [
    {
      name: 'formCode',
      type: 'text',
      label: t('schemaFormData.filter.formCode'),
      placeholder: t('schemaFormData.filter.formCodePlaceholder'),
    },
  ],
};
