import type { AxiosConfig } from '../../config';
import { axiosPlus } from '../../config';

export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/mobile/async-task/list', 'post'>, 'url' | 'method'>,
) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/async-task/list',
    method: 'post',
    ...axiosConfig,
  });
