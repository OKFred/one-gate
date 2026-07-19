import type { components, paths } from '../../../types/openapi';

type ResWrapper<T> = {
  ok: boolean;
  message?: string;
  data: T;
};

export type ListConfigReq =
  paths['/api/v1/base/config/list']['post']['requestBody']['content']['application/json'];
export type ConfigRes = components['schemas']['/api/v1/base/config/list']['list'][0];

export type AddConfigReq =
  paths['/api/v1/base/config/add']['post']['requestBody']['content']['application/json'];
export type UpdateConfigReq =
  paths['/api/v1/base/config/update']['post']['requestBody']['content']['application/json'];
export type DeleteConfigReq =
  paths['/api/v1/base/config/delete']['post']['requestBody']['content']['application/json'];
export type GetConfigSchemaReq = paths['/api/v1/base/config/schema']['get']['parameters']['query'];

export type SchemaRes = components['schemas']['/api/v1/base/config/schema'];
export type NamespacesRes = components['schemas']['/api/v1/base/config/namespaces'][0];
