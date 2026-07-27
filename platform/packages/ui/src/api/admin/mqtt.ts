import type { AxiosConfig } from '../config';
import { axiosPlus } from '../config';

/**
 * 发布 MQTT 消息 API
 */
export const publishFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mqtt/publish', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/mqtt/publish',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 查询 MQTT 历史消息日志 API
 */
export const logsFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/admin/mqtt/logs', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/mqtt/logs',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 获取 MQTT 计算后的动态签名与连接凭证 API
 */
export const credentialsFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/admin/mqtt/credentials', 'get'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/mqtt/credentials',
    method: 'get',
    ...axiosConfig,
  });
};

/**
 * 测试 MQTT 服务连通性 API
 */
export const testConnectionFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/admin/mqtt/testConnection', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/mqtt/testConnection',
    method: 'post',
    ...axiosConfig,
  });
};
