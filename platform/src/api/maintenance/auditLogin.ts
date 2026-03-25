import { axiosPlus } from '../config';
import type { AxiosConfig } from '../config';

/** 获取登录审计列表 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/maintenance/audit_login/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/maintenance/audit_login/list',
    method: 'post',
    ...axiosConfig,
  });
};
