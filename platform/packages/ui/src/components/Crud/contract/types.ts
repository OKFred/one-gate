import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { ProjectedFormField } from '@hodor/contracts/frontend';
import type { CrudHelpers, RowAction } from '../types';
import type { CardField, TableColumn } from '@/components/Responsive/ResponsiveList';

export interface FormFieldExtensionContext<TRecord> {
  form: Partial<TRecord>;
  setForm: Dispatch<SetStateAction<Partial<TRecord>>>;
  isEdit: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  disabled: boolean;
}

export interface CrudExtensions<TRecord extends Record<string, unknown> = Record<string, unknown>> {
  toolbarActions?:
    ReactNode | ((helpers: CrudHelpers<TRecord>, t: (key: string) => string) => ReactNode);
  rowActions?: (t: (key: string) => string, helpers?: CrudHelpers<TRecord>) => RowAction<TRecord>[];
  dialogs?: (helpers: CrudHelpers<TRecord>) => ReactNode;
  customCells?: Record<
    string,
    (row: TRecord, t: (key: string) => string, helpers?: CrudHelpers<TRecord>) => ReactNode
  >;
  transformColumns?: (
    columns: TableColumn<TRecord>[],
    t: (key: string) => string,
  ) => TableColumn<TRecord>[];
  customCardFields?: (t: (key: string) => string) => CardField<TRecord>[];
  customFormFields?: Record<string, (ctx: FormFieldExtensionContext<TRecord>) => ReactNode>;
  extraFormFields?: () => ProjectedFormField[];
  formHeader?: (ctx: FormFieldExtensionContext<TRecord>) => ReactNode;
  formFooter?: (ctx: FormFieldExtensionContext<TRecord>) => ReactNode;
  afterOpen?: (form: Partial<TRecord>, isEdit: boolean, row?: TRecord) => Partial<TRecord>;
  beforeSubmitAsync?: (
    form: Partial<TRecord>,
    isEdit: boolean,
  ) => Promise<Partial<TRecord>> | Partial<TRecord>;
  afterAdd?: (
    response: unknown,
    submittedForm: Partial<TRecord>,
    helpers: { refreshTable: () => void },
  ) => void | Promise<void>;
  listAdapter?: (args: {
    data: Record<string, unknown>;
    errorPresentation?: 'global' | 'local';
  }) => Promise<{
    data: {
      ok?: boolean;
      data?: { list?: TRecord[]; total?: number; hasMore?: boolean; cursor?: string };
    };
  }>;
  mutationAdapter?: {
    add?: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    update?: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    delete?: (args: { data: { id: number | string } }) => Promise<unknown>;
  };
}
