import * as SchemaFormDataAPI from '@/api/infra/data/schemaFormData';
import * as SchemaFormAPI from '@/api/infra/data/schemaForm';

// ==================== SchemaForm ====================
export type ListSchemaFormReq = NonNullable<Parameters<typeof SchemaFormAPI.listFn>[0]['data']>;
export type ListSchemaFormRes = Awaited<ReturnType<typeof SchemaFormAPI.listFn>>['data']['data'];
export type GetSchemaFormReq = NonNullable<Parameters<typeof SchemaFormAPI.getFn>[0]['data']>;
export type GetSchemaFormRes = Awaited<ReturnType<typeof SchemaFormAPI.getFn>>['data']['data'];
export type AddSchemaFormReq = NonNullable<Parameters<typeof SchemaFormAPI.addFn>[0]['data']>;
export type AddSchemaFormRes = Awaited<ReturnType<typeof SchemaFormAPI.addFn>>['data']['data'];
export type UpdateSchemaFormReq = NonNullable<Parameters<typeof SchemaFormAPI.updateFn>[0]['data']>;
export type UpdateSchemaFormRes = Awaited<
  ReturnType<typeof SchemaFormAPI.updateFn>
>['data']['data'];
export type DeleteSchemaFormReq = NonNullable<Parameters<typeof SchemaFormAPI.deleteFn>[0]['data']>;
export type DeleteSchemaFormRes = Awaited<
  ReturnType<typeof SchemaFormAPI.deleteFn>
>['data']['data'];

// ==================== SchemaFormData ====================
export type ListSchemaFormDataReq = NonNullable<
  Parameters<typeof SchemaFormDataAPI.listFn>[0]['data']
>;
export type ListSchemaFormDataRes = Awaited<
  ReturnType<typeof SchemaFormDataAPI.listFn>
>['data']['data'];
export type GetSchemaFormDataReq = NonNullable<
  Parameters<typeof SchemaFormDataAPI.getFn>[0]['data']
>;
export type GetSchemaFormDataRes = Awaited<
  ReturnType<typeof SchemaFormDataAPI.getFn>
>['data']['data'];
export type SubmitSchemaFormDataReq = NonNullable<
  Parameters<typeof SchemaFormDataAPI.submitFn>[0]['data']
>;
export type SubmitSchemaFormDataRes = Awaited<
  ReturnType<typeof SchemaFormDataAPI.submitFn>
>['data']['data'];
export type DeleteSchemaFormDataReq = NonNullable<
  Parameters<typeof SchemaFormDataAPI.deleteFn>[0]['data']
>;
export type DeleteSchemaFormDataRes = Awaited<
  ReturnType<typeof SchemaFormDataAPI.deleteFn>
>['data']['data'];
