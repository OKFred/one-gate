import type { AxiosConfig } from '../config';
import { axiosPlus } from '../config';

/**
 * 创建 RealtimeKit 通话会话 API
 */
export const createMeetingFn = (
  axiosConfig?: Omit<AxiosConfig<'/api/v1/admin/voice/meeting', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/voice/meeting',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 加入通话会话，获取参与者 authToken API
 */
export const joinMeetingFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/voice/join', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/voice/join',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 结束通话会话 API
 */
export const endMeetingFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/voice/meeting/end', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/voice/meeting/end',
    method: 'post',
    ...axiosConfig,
  });
};

/**
 * 分页查询通话会话历史记录 API
 */
export const listSessionsFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/voice/meeting/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/voice/meeting/list',
    method: 'post',
    ...axiosConfig,
  });
};
