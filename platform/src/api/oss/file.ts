import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';
import axios from 'axios';

/** 获取上传预签名 URL */
export const getUploadUrlFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/oss/file/getUploadUrl', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/oss/file/getUploadUrl',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取下载预签名 URL */
export const getDownloadUrlFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/oss/file/getDownloadUrl', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/oss/file/getDownloadUrl',
    method: 'post',
    ...axiosConfig,
  });
};

/** 列出文件 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/oss/file/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/oss/file/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除文件 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/oss/file/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/oss/file/delete',
    method: 'post',
    ...axiosConfig,
  });
};

/** 核心上传逻辑 (使用 Axios 直接 PUT 到预签名 URL) */
export const directUploadFn = (
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
) => {
  return axios.put(url, file, {
    headers: {
      'Content-Type': contentType,
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress?.(percentCompleted);
      }
    },
  });
};
