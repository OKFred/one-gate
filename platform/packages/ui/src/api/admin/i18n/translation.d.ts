import type { AxiosConfig } from '../../config';
export declare const listAllFn: (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/i18n/translation/listAll', 'post'>,
    'url' | 'method'
  >,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/i18n/translation/listAll', 'post'>
>;
export declare const listFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/translation/list', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/i18n/translation/list', 'post'>
>;
export declare const getFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/translation/get', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/i18n/translation/get', 'post'>
>;
export declare const addFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/translation/add', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/i18n/translation/add', 'post'>
>;
export declare const updateFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/translation/update', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/i18n/translation/update', 'post'>
>;
export declare const deleteFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/i18n/translation/delete', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/i18n/translation/delete', 'post'>
>;
export declare const checkDuplicateFn: (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/i18n/translation/checkDuplicate', 'post'>,
    'url' | 'method'
  >,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/i18n/translation/checkDuplicate', 'post'>
>;
