import type { components, paths } from '../../../types/openapi';

// Removed ResWrapper

export type ListConfigReq =
  paths['/api/v1/admin/base/sys_config/list']['post']['requestBody']['content']['application/json'];
export type ConfigRes = components['schemas']['admin.base.sys_config.list.res']['data']['list'][0];

export type AddConfigReq =
  paths['/api/v1/admin/base/sys_config/add']['post']['requestBody']['content']['application/json'];
export type UpdateConfigReq =
  paths['/api/v1/admin/base/sys_config/update']['post']['requestBody']['content']['application/json'];
export type DeleteConfigReq =
  paths['/api/v1/admin/base/sys_config/delete']['post']['requestBody']['content']['application/json'];
export type GetConfigSchemaReq =
  paths['/api/v1/admin/base/sys_config/schema']['post']['requestBody']['content']['application/json'];

export type SchemaRes = components['schemas']['admin.base.sys_config.schema.res']['data'];
export type NamespacesRes =
  components['schemas']['admin.base.sys_config.namespaces.res']['data'][0];
