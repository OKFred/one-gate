import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { paths } from '@/types/openapi';
export type UrlGeneric<U> = U extends keyof paths ? paths[U] : never;
type SchemaGeneric<U, M> = M extends keyof UrlGeneric<U> ? UrlGeneric<U>[M] : never;
export type RequestGeneric<U, M> = {
  url: U;
  method: M;
  headers?: SchemaGeneric<U, M> extends {
    parameters: {
      header?: infer H;
    };
  }
    ? Partial<H>
    : never;
  path?: SchemaGeneric<U, M> extends {
    parameters: {
      path?: infer P;
    };
  }
    ? P
    : never;
  params?: SchemaGeneric<U, M> extends {
    parameters: {
      query?: infer Q;
    };
  }
    ? Q
    : never;
  cookie?: SchemaGeneric<U, M> extends {
    parameters: {
      cookie?: infer C;
    };
  }
    ? C
    : never;
  data?: SchemaGeneric<U, M> extends {
    requestBody?: {
      content: {
        'application/json': infer B;
      };
    };
  }
    ? B
    : never;
};
export type ResponseGeneric<U, M> = {
  data: SchemaGeneric<U, M> extends {
    responses: {
      200: {
        content: {
          'application/json': infer T;
        };
      };
    };
  }
    ? T
    : never;
  headers: SchemaGeneric<U, M> extends {
    responses: {
      200: {
        headers: infer H;
      };
    };
  }
    ? H
    : never;
};
export type AxiosConfig<U, M> = Omit<
  AxiosRequestConfig,
  'url' | 'method' | 'headers' | 'path' | 'params' | 'data' | 'ignoreAbort'
> &
  RequestGeneric<U, M> & {
    ignoreAbort?: boolean;
    errorPresentation?: 'global' | 'local';
  };
export interface ApiFailure {
  kind: 'business' | 'unknown' | 'session';
  code: string | null;
  message: string | null;
}
export declare function classifyApiFailure(error: unknown): ApiFailure;
declare const axiosPlus: <U extends keyof paths, M extends keyof UrlGeneric<U>>(
  axiosConfig: AxiosConfig<U, M>,
) => Promise<Omit<AxiosResponse, 'data' | 'headers'> & ResponseGeneric<U, M>>;
export { axiosPlus };
