import type { components, paths } from '../../../types/openapi';

export type ListWebhookConfigReq =
  paths['/api/v1/admin/base/webhook_config/list']['post']['requestBody']['content']['application/json'];
export type WebhookConfigRow =
  components['schemas']['admin.base.webhook_config.list.res']['data']['list'][0];
export type WebhookConfigDetail =
  components['schemas']['admin.base.webhook_config.detail.res']['data'];
export type AddWebhookConfigReq =
  paths['/api/v1/admin/base/webhook_config/add']['post']['requestBody']['content']['application/json'];
export type UpdateWebhookConfigReq =
  paths['/api/v1/admin/base/webhook_config/update']['post']['requestBody']['content']['application/json'];
