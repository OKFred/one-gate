import axios from 'axios';
import type { Method, AxiosRequestConfig, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { paths } from '@/types/openapi'; //由openapi-typescript自动生成的类型

type UrlGeneric<U> = U extends keyof paths ? paths[U] : never;

type SchemaGeneric<U, M> = M extends keyof UrlGeneric<U> ? UrlGeneric<U>[M] : never;

export type RequestGeneric<U, M> = {
  url: string;
  method: M;
  headers?: SchemaGeneric<U, M> extends { parameters: { header?: infer H } } ? Partial<H> : never;
  path?: SchemaGeneric<U, M> extends { parameters: { path?: infer P } } ? P : never;
  params?: SchemaGeneric<U, M> extends { parameters: { query?: infer Q } } ? Q : never;
  cookie?: SchemaGeneric<U, M> extends { parameters: { cookie?: infer C } } ? C : never;
  data?: SchemaGeneric<U, M> extends {
    requestBody?: { content: { 'application/json': infer B } };
  }
    ? B
    : never;
};

export type ResponseGeneric<U, M> = {
  data: SchemaGeneric<U, M> extends {
    responses: { 200: { content: { 'application/json': infer T } } };
  }
    ? T
    : never;
  headers: SchemaGeneric<U, M> extends {
    responses: { 200: { headers: infer H } };
  }
    ? H
    : never;
};

export type AxiosConfig<U, M> = Omit<
  AxiosRequestConfig,
  'url' | 'method' | 'headers' | 'path' | 'params' | 'data'
> &
  RequestGeneric<U, M>;

export type AxiosPlus = <U extends keyof paths, M extends keyof UrlGeneric<U>>(
  axiosConfig: RequestGeneric<U, M>,
  // customOptions?: Record<string, unknown>,
  // loadingOptions?: Record<string, unknown>,
) => Promise<ResponseGeneric<U, M>>;

/** @description  axios 实例 */
const service = axios.create({
  /*   baseURL: "http://localhost:3000", */
  timeout: 10_000,
});

// 导入认证工具
import { authUtils } from '@/utils/auth';

const axiosPlus: AxiosPlus = async (
  axiosConfig,
  /*  customOptions,
  loadingOptions, */
) => {
  const { method, ...rest } = axiosConfig;
  const applyInterceptors = interceptors(service);
  return await applyInterceptors({
    method: method as Lowercase<Method>,
    ...rest,
  });
};

function interceptors(service: AxiosInstance) {
  /** @description 添加请求拦截器 */
  service.interceptors.request.use(
    (config: InternalAxiosRequestConfig & { path?: Record<string, unknown> }) => {
      // 自动添加认证token
      const token = authUtils.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      let _url = config.url;
      if (!_url) {
        throw new Error('url is required');
      }
      const path = config.path;
      if (typeof path === 'object' && path) {
        for (const [key, value] of Object.entries(path)) {
          _url = _url.replace(`{${key}}`, String(value));
        }
        config.url = _url;
        console.log({ config });
      }
      return config;
    },
    function (error) {
      return Promise.reject(error);
    },
  );
  /** @description 添加响应拦截器 */
  service.interceptors.response.use(
    function (response) {
      if (response.status === 200) {
        return response;
      } else {
        if (response.data && response.data.message) {
          console.error(response.data.message);
        }
        return Promise.reject(response);
      }
    },
    function (error) {
      if (error.response) {
        // 处理401未授权错误
        if (error.response.status === 401) {
          authUtils.logout();
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        if (error.response.data && error.response.data.message) {
          console.error(error.response.data.message);
        }
      }
      return Promise.reject(error);
    },
  );
  return service;
}
export default axiosPlus;
