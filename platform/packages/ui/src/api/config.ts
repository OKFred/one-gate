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
import {
  authUtils,
  captureRequestAuthSession,
  isCurrentAuthSession,
  TOTP_GATE_REQUIRED_EVENT,
  type AuthSessionSnapshot,
} from '@/utils/auth';
// 导入翻译函数创建器（非Hook版本，可在拦截器中使用）
import { createTranslator } from '@/hooks/useTranslation';
import { loginPath } from '@/routes';
import { RequestQueueManager } from './queue';

const requestQueueManager = new RequestQueueManager();

type SessionRequestConfig = InternalAxiosRequestConfig & {
  path?: Record<string, unknown>;
  requestId?: string;
  ignoreAbort?: boolean;
  authSession?: AuthSessionSnapshot;
};

function assertCurrentRequestSession(config: SessionRequestConfig): void {
  if (!config.authSession || !isCurrentAuthSession(config.authSession)) {
    throw new axios.CanceledError('Authentication session changed');
  }
}

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
  baseURL: import.meta.env.MODE === 'production' ? import.meta.env.VITE_SERVER_URL : '',
  timeout: import.meta.env.MODE !== 'production' ? 180000 : 30000,
  withCredentials: true,
});

// 初始化拦截器（只执行一次）
function setupInterceptors(service: AxiosInstance) {
  /** @description 添加请求拦截器 */
  service.interceptors.request.use(
    (config: SessionRequestConfig) => {
      assertCurrentRequestSession(config);
      // 如果没有标记忽略 abort，才创建 AbortController 并添加到队列
      if (!config.ignoreAbort) {
        const controller = new AbortController();
        const requestId = requestQueueManager.addRequest(controller);
        config.requestId = requestId;
        config.signal = controller.signal;
      }
      const correlationId = config.requestId ?? globalThis.crypto.randomUUID();
      config.requestId = correlationId;
      config.headers['X-Request-Id'] = correlationId;

      // 自动添加认证token
      const token = config.authSession?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (config.method !== 'get' && config.method !== 'head' && !config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }

      let _url = config.url;
      if (!_url) {
        throw new Error('url is required');
      }
      // 自动添加post请求中的data，避免请求报错
      if (config.method === 'post' && !config?.data) {
        config.data = {};
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
      const config = response.config as SessionRequestConfig;
      const requestId = config.requestId;
      if (requestId) {
        requestQueueManager.removeRequest(requestId);
      }
      assertCurrentRequestSession(config);

      if (response.status === 200) {
        // 检查响应数据中的 ok 字段
        if (!response.data || response.data?.ok === false) {
          // 获取用户语言创建翻译函数
          const langCode = authUtils.getUserInfo()?.langCode;
          const t = createTranslator(langCode);
          handleErrorResponse(response.data, t('error.requestFailed'));
          return Promise.reject(response);
        }
      }
      return response;
    },
    function (error: unknown) {
      const axiosError = axios.isAxiosError(error) ? error : undefined;
      const config = axiosError?.config as SessionRequestConfig | undefined;
      const requestId = config?.requestId;
      if (requestId) requestQueueManager.removeRequest(requestId);
      if (axios.isCancel(error)) return Promise.reject(error);
      if (config) assertCurrentRequestSession(config);

      // 获取用户语言创建翻译函数
      const langCode = authUtils.getUserInfo()?.langCode;
      const t = createTranslator(langCode);
      const status = axiosError?.response?.status;
      const errorCode = readErrorCode(axiosError?.response?.data);
      const errorMessage = error instanceof Error ? error.message : '';

      if (status === 401 && errorCode?.startsWith('TOTP_')) {
        if (errorCode === 'TOTP_GATE_REQUIRED') {
          requestQueueManager.abortAllRequests();
          window.dispatchEvent(new Event(TOTP_GATE_REQUIRED_EVENT));
        } else {
          handleErrorResponse(axiosError?.response?.data, errorMessage || t('error.requestFailed'));
        }
        return Promise.reject(error);
      }

      // 401 未授权：清理并跳转登录
      if (status === 401) {
        // 使用 hash 路由检查当前位置（因为项目使用了 HashRouter）
        const currentHash = window.location.hash.slice(1); // 移除 # 前缀
        const isAuthPage =
          currentHash.startsWith(loginPath) || currentHash.startsWith('/sso/callback');
        if (!isAuthPage) {
          // abort 队列中的所有其他请求
          requestQueueManager.abortAllRequests();

          showGlobalNotification({
            message: t('error.sessionExpired'),
            type: 'warning',
            beforeClose: (_, __, done) => {
              if (config?.authSession && isCurrentAuthSession(config.authSession)) {
                authUtils.logout();
                window.location.hash = loginPath;
              }
              done();
            },
          });
        }
        return Promise.reject(error);
      }

      // 其他业务错误：优先展示后端 message
      handleErrorResponse(axiosError?.response?.data, errorMessage || t('error.networkError'));
      return Promise.reject(error);
    },
  );
  return service;
}

function readErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('data' in data)) return undefined;
  const payload = data.data;
  if (!payload || typeof payload !== 'object' || !('code' in payload)) return undefined;
  return typeof payload.code === 'string' ? payload.code : undefined;
}

export type ApiErrorReference = {
  code: string | null;
  requestId: string | null;
};

function safeReferencePart(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/u.test(value) ? value : null;
}

export function readApiErrorReference(error: unknown): ApiErrorReference | null {
  if (!axios.isAxiosError(error)) return null;
  const code = safeReferencePart(readErrorCode(error.response?.data));
  const responseRequestId = safeReferencePart(error.response?.headers?.['x-request-id']);
  const requestRequestId = safeReferencePart(
    (error.config as (InternalAxiosRequestConfig & { requestId?: string }) | undefined)?.requestId,
  );
  const requestId = responseRequestId ?? requestRequestId;
  return code || requestId ? { code, requestId } : null;
}

function handleErrorResponse(
  data: { message?: string; data?: unknown } | null | undefined,
  fallbackMessage: string,
) {
  const message = data?.message || fallbackMessage;
  showSnackbar({ message, type: 'error' });

  if (import.meta.env.MODE !== 'production' && data?.data) {
    console.error('[API Error Details]:', data.data);
  }
}

// 初始化拦截器
setupInterceptors(service);

// axiosPlus 函数，直接使用已配置好拦截器的 service
const axiosPlus = async <U extends keyof paths, M extends keyof UrlGeneric<U>>(
  axiosConfig: AxiosConfig<U, M>,
): Promise<Omit<AxiosResponse, 'data' | 'headers'> & ResponseGeneric<U, M>> => {
  const config: AxiosRequestConfig & { authSession: AuthSessionSnapshot } = {
    ...(axiosConfig as AxiosRequestConfig),
    authSession: captureRequestAuthSession(),
  };
  return await service(config);
};

export { axiosPlus };
