import type { AxiosRequestConfig } from 'axios';
import { axiosPlus } from '@/api/config';

export interface OpenAiModelItem {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/** OpenAI 兼容模型列表接口 */
export const modelsFn = (axiosConfig?: Omit<AxiosRequestConfig, 'url' | 'method'>) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/openai/models',
    method: 'post',
    data: {},
    ...axiosConfig,
  } as unknown as Parameters<typeof axiosPlus>[0]) as Promise<{
    data: { ok: boolean; message: string; data: { object: string; data: OpenAiModelItem[] } };
  }>;
};
