import { postApiJson, type DynamicApiRequestOptions } from '@/api/config';

export interface CrudListResponse<TRecord> {
  list?: TRecord[];
  total?: number;
  hasMore?: boolean;
  cursor?: string;
}

/**
 * 声明式 JSON 契约专用统一 POST CRUD 调用封装。
 * 自动复用全局 axios 实例的认证、Session 隔离、TOTP 门禁与统一错误提示拦截器。
 */
export function postCrudEndpoint<TData = unknown>(
  url: string,
  options: DynamicApiRequestOptions = {},
) {
  return postApiJson<TData>(url, options);
}
