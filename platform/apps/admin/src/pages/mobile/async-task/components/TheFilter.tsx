import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAsyncTaskReq } from '@/api/admin/mobile/type';

export interface FilterState {
  keyword: string;
  clientId: string;
  status: ListAsyncTaskReq['status'];
  priority: ListAsyncTaskReq['priority'];
  orderBy: NonNullable<ListAsyncTaskReq['orderBy']>;
  descend: boolean;
}

export const defaultFilters: FilterState = {
  keyword: '',
  clientId: '',
  status: undefined,
  priority: undefined,
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
        { label: 'RUNNING', value: 'RUNNING' },
        { label: 'SUCCESS', value: 'SUCCESS' },
        { label: 'FAILURE', value: 'FAILURE' },
        { label: 'TIMEOUT', value: 'TIMEOUT' },
        { label: 'REJECTED', value: 'REJECTED' },
        { label: 'CANCELLED', value: 'CANCELLED' },
      ],
    },
    {
      name: 'priority',
      type: 'select',
      label: t('mobile.asyncTask.priority'),
      options: [
        { label: 'HIGH', value: 'HIGH' },
        { label: 'NORMAL', value: 'NORMAL' },
        { label: 'LOW', value: 'LOW' },
      ],
    },
    {
      name: 'orderBy',
      type: 'select',
      label: t('filter.orderBy'),
      options: [
        { label: t('columns.id'), value: 'id' },
        { label: t('mobile.asyncTask.taskId'), value: 'taskId' },
        { label: t('mobile.device.clientId'), value: 'clientId' },
        { label: t('status.label'), value: 'status' },
        { label: t('mobile.asyncTask.priority'), value: 'priority' },
        { label: t('columns.createTime'), value: 'createTimeUtc' },
      ],
    },
    {
      name: 'descend',
      type: 'select',
      label: t('filter.sortOrder'),
      options: [
        { label: t('filter.asc'), value: false },
        { label: t('filter.desc'), value: true },
      ],
    },
  ],
};
