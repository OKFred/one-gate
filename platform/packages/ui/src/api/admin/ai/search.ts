import type { AxiosRequestConfig } from 'axios';
import { axiosPlus } from '@/api/config';

export interface SearchResultItem {
  id: string;
  title: string;
  type: 'menu' | 'config' | 'feature' | 'system';
  path?: string;
  score: number;
  description?: string;
  snippet?: string;
}

export interface SearchResData {
  list: SearchResultItem[];
  total: number;
}

/** 全局 AI 智能搜索接口 */
export const searchFn = (
  axiosConfig: {
    data: {
      query: string;
      limit?: number;
    };
  } & Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>,
) => {
  return axiosPlus({
    url: '/api/v1/admin/ai/search/search',
    method: 'post',
    ...axiosConfig,
  } as unknown as Parameters<typeof axiosPlus>[0]) as Promise<{
    data: { ok: boolean; message: string; data: SearchResData };
  }>;
};
