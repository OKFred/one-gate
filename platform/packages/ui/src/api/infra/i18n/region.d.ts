import type { AxiosConfig } from '../../config';
export declare const listAllFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/region/listAll', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/region/listAll', 'post'>
>;
export declare const listFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/region/list', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/region/list', 'post'>
>;
export declare const getFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/region/get', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/region/get', 'post'>
>;
export declare const addFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/region/add', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/region/add', 'post'>
>;
export declare const updateFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/region/update', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/region/update', 'post'>
>;
export declare const deleteFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/region/delete', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/region/delete', 'post'>
>;
