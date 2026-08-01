import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAsyncTaskReq } from '@/api/admin/mobile/type';

export interface FilterState {
  keyword: string;
  clientId: string;
  status: ListAsyncTaskReq['status'];
  orderBy: NonNullable<ListAsyncTaskReq['orderBy']>;
  descend: boolean;
}

export const defaultFilters: FilterState = {
  keyword: '',
  clientId: '',
  status: undefined,
  orderBy: 'id',
  descend: true,
};

export const filterConfig: SchemaCrudConfig<
  unknown,
  FilterState,
  ListAsyncTaskReq,
  unknown
>['filter'] = {
  defaultFilters,
  fields: (t) => [
    {
      name: 'keyword',
      type: 'text',
      label: t('mobile.asyncTask.taskId'),
      placeholder: t('common.searchPlaceholder'),
    },
    {
      name: 'clientId',
      type: 'text',
      label: t('mobile.device.clientId'),
    },
    {
      name: 'status',
      type: 'select',
      label: t('status.label'),
      options: [
        { label: 'PENDING', value: 'PENDING' },
        { label: 'SUCCESS', value: 'SUCCESS' },
        { label: 'FAILURE', value: 'FAILURE' },
        { label: 'TIMEOUT', value: 'TIMEOUT' },
      ],
    },
  ],
};
