import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AsyncTaskRes } from './components/TheTable';
import * as AsyncTaskAPI from '@/api/admin/mobile/async-task';
import type { ListAsyncTaskReq } from '@/api/admin/mobile/type';
import type { SchemaCrudConfig } from '@/components/Crud';

const ASYNC_TASK_CONFIG: SchemaCrudConfig<AsyncTaskRes, FilterState, ListAsyncTaskReq> = {
  apiKeyName: 'id',
  permissions: {
    add: [],
    edit: [],
    delete: [], // Read-only view
  },
  api: {
    list: AsyncTaskAPI.listFn,
  },
  filter: {
    defaultFilters,
    fields: filterConfig.fields,
    transformRequest: (filters) =>
      ({
        keyword: filters.keyword || undefined,
        clientId: filters.clientId || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        orderBy: filters.orderBy,
        descend: filters.descend,
      }) as ListAsyncTaskReq,
  },
  table: {
    columns: tableConfig.columns,
    cardFields: () => [],
    actions: () => [],
  },
  form: {
    schema: {},
    defaultForm: {},
    renderForm: () => null,
  },
};

export default function AsyncTaskPage() {
  return <SchemaCrudPage config={ASYNC_TASK_CONFIG} />;
}
