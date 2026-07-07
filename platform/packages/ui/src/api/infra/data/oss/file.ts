import type { AxiosConfig } from '@/api/config';
import { axiosPlus } from '@/api/config';
import axios from 'axios';

/** 分页获取文件列表 */
export const listFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/data/oss/file/list', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/data/oss/file/list',
    method: 'post',
    ...axiosConfig,
  });
};

/** 分页获取目录列表 */
export const listDirectoryFn = (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/infra/data/oss/file/listDirectory', 'post'>,
    'url' | 'method'
  >,
) => {
  return axiosPlus({
    url: '/api/v1/infra/data/oss/file/listDirectory',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取全部文件列表 */
export const listAllFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/data/oss/file/listAll', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/data/oss/file/listAll',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取文件详情(含下载链接) */
export const getFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/data/oss/file/get', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/data/oss/file/get',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取新增文件预签名URL */
export const addFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/data/oss/file/add', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/data/oss/file/add',
    method: 'post',
    ...axiosConfig,
  });
};

/** 获取更新(覆盖)文件预签名URL */
export const updateFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/data/oss/file/update', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/data/oss/file/update',
    method: 'post',
    ...axiosConfig,
  });
};

/** 删除文件 */
export const deleteFn = (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/data/oss/file/delete', 'post'>, 'url' | 'method'>,
) => {
  return axiosPlus({
    url: '/api/v1/infra/data/oss/file/delete',
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
