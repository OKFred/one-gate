import axios from 'axios';
import type {
  AxiosRequestConfig,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import type { paths } from '@/types/openapi'; //由openapi-typescript自动生成的类型
import { showGlobalNotification, showSnackbar } from '@/components/Notification';

// 导入认证工具
import { authUtils } from '@/utils/auth';
// 导入翻译函数创建器（非Hook版本，可在拦截器中使用）
import { createTranslator } from '@/hooks/useTranslation';
import { loginPath } from '@/routes';
import { RequestQueueManager } from './queue';

const requestQueueManager = new RequestQueueManager();

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
  'url' | 'method' | 'headers' | 'path' | 'params' | 'data' | 'ignoreAbort'
> &
  RequestGeneric<U, M> & { ignoreAbort?: boolean };

/** @description  axios 实例 */
const service = axios.create({
  /*   baseURL: "http://localhost:3000", */
  timeout: process.env.NODE_ENV !== 'production' ? 180000 : 30000,
});

// 初始化拦截器（只执行一次）
function setupInterceptors(service: AxiosInstance) {
  /** @description 添加请求拦截器 */
  service.interceptors.request.use(
    (
      config: InternalAxiosRequestConfig & {
        path?: Record<string, unknown>;
        requestId?: string;
        ignoreAbort?: boolean;
      },
    ) => {
      // 如果没有标记忽略 abort，才创建 AbortController 并添加到队列
      if (!config.ignoreAbort) {
        const controller = new AbortController();
        const requestId = requestQueueManager.addRequest(controller);
        config.requestId = requestId;
        config.signal = controller.signal;
      }

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
      // 从队列中移除已完成的请求
      const requestId = (response.config as InternalAxiosRequestConfig & { requestId?: string })
        .requestId;
      if (requestId) {
        requestQueueManager.removeRequest(requestId);
      }

      if (response.status === 200) {
        // 检查响应数据中的 ok 字段
        if (!response.data || response.data?.ok === false) {
          // 获取用户语言创建翻译函数
          const langCode = authUtils.getUserInfo()?.langCode;
          const t = createTranslator(langCode);
          const errorMessage = response.data.message || t('error.requestFailed');
          handleErrorResponse(errorMessage);
          return Promise.reject(response);
        }
      }
      return response;
    },
    function (error) {
      // 获取用户语言创建翻译函数
      const langCode = authUtils.getUserInfo()?.langCode;
      const t = createTranslator(langCode);
      const status = error.response?.status;
      const requestId = (error.config as InternalAxiosRequestConfig & { requestId?: string })
        ?.requestId;

      // 401 未授权：清理并跳转登录
      if (status === 401) {
        // 使用 hash 路由检查当前位置（因为项目使用了 HashRouter）
        const currentHash = window.location.hash.slice(1); // 移除 # 前缀
        if (!currentHash.startsWith(loginPath)) {
          // abort 队列中的所有其他请求
          requestQueueManager.abortAllRequests(requestId);

          showGlobalNotification({
            message: t('error.sessionExpired'),
            type: 'warning',
            beforeClose: (_, __, done) => {
              authUtils.logout();
              window.location.hash = loginPath;
              done();
            },
          });
        } else {
          console.log('当前已在登录页，无需重复跳转');
          // 移除当前请求
          if (requestId) {
            requestQueueManager.removeRequest(requestId);
          }
        }
        return Promise.reject(error);
      }

      // 移除当前请求
      if (requestId) {
        requestQueueManager.removeRequest(requestId);
      }

      // 其他业务错误：优先展示后端 message
      handleErrorResponse(
        error.response?.data?.message || error.message || t('error.networkError'),
      );
      return Promise.reject(error);
    },
  );
  return service;
}

function handleErrorResponse(errorMessage: string) {
  showSnackbar({ message: errorMessage, type: 'error' });
  if (process.env.NODE_ENV !== 'production') {
    console.error(errorMessage);
  }
}

// 初始化拦截器
setupInterceptors(service);

// axiosPlus 函数，直接使用已配置好拦截器的 service
const axiosPlus = async <U extends keyof paths, M extends keyof UrlGeneric<U>>(
  axiosConfig: AxiosConfig<U, M>,
): Promise<Omit<AxiosResponse, 'data' | 'headers'> & ResponseGeneric<U, M>> => {
  return await service(axiosConfig as AxiosRequestConfig);
};

export { axiosPlus };
