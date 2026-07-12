import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListProfileReq } from '@/api/personal/type';

export interface FilterState {
  userId?: number;
}

export const defaultFilters: FilterState = {
  userId: undefined,
};

export const filterConfig: SchemaCrudConfig<any, FilterState, ListProfileReq>['filter'] = {
  defaultFilters,
  fields: () => [],
  transformRequest: (filters) =>
    ({
      userId: filters.userId ? Number(filters.userId) : undefined,
    }) as ListProfileReq,
};
