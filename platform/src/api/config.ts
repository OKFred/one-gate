import axios from 'axios';
import type {
  AxiosRequestConfig,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import type { paths } from '@/types/openapi'; //由openapi-typescript自动生成的类型
import { showGlobalNotification } from '@/utils/notification';

// 导入认证工具
import { authUtils } from '@/utils/auth';

export type UrlGeneric<U> = U extends keyof paths ? paths[U] : never;

type SchemaGeneric<U, M> = M extends keyof UrlGeneric<U> ? UrlGeneric<U>[M] : never;

export type RequestGeneric<U, M> = {
  url: U;
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

/** @description  axios 实例 */
const service = axios.create({
  /*   baseURL: "http://localhost:3000", */
  timeout: 10_000,
});

// 初始化拦截器（只执行一次）
function setupInterceptors(service: AxiosInstance) {
  /** @description 添加请求拦截器 */
  service.interceptors.request.use(
    (config: InternalAxiosRequestConfig & { path?: Record<string, unknown> }) => {
      // 自动添加认证token
      const token = authUtils.getUserInfo()?.token;
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
        // 检查响应数据中的 ok 字段
        if (response.data && response.data.ok === false) {
          const errorMessage = response.data.message || '请求失败';
          showGlobalNotification({ message: errorMessage, type: 'error' });
          console.error(errorMessage);
          return Promise.reject(response);
        }
        return response;
      } else {
        const errorMessage = response.data?.message || '请求失败';
        showGlobalNotification({ message: errorMessage, type: 'error' });
        console.error(errorMessage);
        return Promise.reject(response);
      }
    },
    function (error) {
      if (error.response) {
        // 处理401未授权错误
        if (error.response.status === 401) {
          // 如果当前不在登录页，才执行跳转逻辑
          if (window.location.pathname !== '/login') {
            showGlobalNotification({
              message: '登录已过期，请重新登录',
              type: 'warning',
              beforeClose: (action, instance, done) => {
                console.log(action, instance);
                authUtils.logout();
                window.location.href = '/login';
                done();
              },
            });
          } else {
            // 如果在登录页，说明是登录失败（密码错误等），显示错误信息即可
            const errorMessage = error.response.data?.message || '登录失败';
            showGlobalNotification({ message: errorMessage, type: 'error' });
          }
          return Promise.reject(error);
        }

        // 显示错误消息
        const errorMessage = error.response.data?.message || '请求失败';
        showGlobalNotification({ message: errorMessage, type: 'error' });
        console.error(errorMessage);
      } else {
        // 网络错误或其他错误
        const errorMessage = error.message || '网络错误';
        showGlobalNotification({ message: errorMessage, type: 'error' });
        console.error(errorMessage);
      }
      return Promise.reject(error);
    },
  );
  return service;
}

// 初始化拦截器
setupInterceptors(service);

// axiosPlus 函数，直接使用已配置好拦截器的 service
const axiosPlus = async <U extends keyof paths, M extends keyof UrlGeneric<U>>(
  axiosConfig: AxiosConfig<U, M>,
  /*  customOptions,
  loadingOptions, */
): Promise<Omit<AxiosResponse, 'data' | 'headers'> & ResponseGeneric<U, M>> => {
  return await service(axiosConfig as AxiosRequestConfig);
};

export { axiosPlus };
