import type { AxiosRequestConfig } from 'axios';
import { axiosPlus } from '@/api/config';

/** AI 对话接口 */
export const askFn = (
  axiosConfig: {
    data: { q: string; history?: { role: string; content: string }[] };
  } & Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>,
) => {
  return axiosPlus({
    url: '/api/v1/ai/chat/ask',
    method: 'post',
    ...axiosConfig,
  } as unknown as Parameters<typeof axiosPlus>[0]) as Promise<{
    data: { ok: boolean; message: string; data: string };
  }>;
};
