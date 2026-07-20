import type { components, paths } from '../../../types/openapi';

// Removed ResWrapper

export type ListConfigReq =
  paths['/api/v1/admin/base/config/list']['post']['requestBody']['content']['application/json'];
export type ConfigRes = components['schemas']['admin.base.config.list.res']['data']['list'][0];

export type AddConfigReq =
  paths['/api/v1/admin/base/config/add']['post']['requestBody']['content']['application/json'];
export type UpdateConfigReq =
  paths['/api/v1/admin/base/config/update']['post']['requestBody']['content']['application/json'];
export type DeleteConfigReq =
  paths['/api/v1/admin/base/config/delete']['post']['requestBody']['content']['application/json'];
export type GetConfigSchemaReq =
  paths['/api/v1/admin/base/config/schema']['post']['requestBody']['content']['application/json'];

export type SchemaRes = components['schemas']['admin.base.config.schema.res']['data'];
export type NamespacesRes = components['schemas']['admin.base.config.namespaces.res']['data'][0];
