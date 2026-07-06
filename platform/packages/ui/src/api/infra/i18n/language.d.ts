import type { AxiosConfig } from '../../config';
export declare const listAllFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/language/listAll', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/language/listAll', 'post'>
>;
export declare const listFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/language/list', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/language/list', 'post'>
>;
export declare const getFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/language/get', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/language/get', 'post'>
>;
export declare const addFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/language/add', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/language/add', 'post'>
>;
export declare const updateFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/language/update', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/language/update', 'post'>
>;
export declare const deleteFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/infra/i18n/language/delete', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/infra/i18n/language/delete', 'post'>
>;
