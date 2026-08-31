import type { AxiosConfig } from '../../config';
export declare const loginFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/login', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/auth/login', 'post'>
>;
export declare const refreshTokenFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/refresh', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/auth/refresh', 'post'>
>;
export declare const checkTokenFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/check', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/auth/check', 'post'>
>;
export declare const getProfileFn: (
  axiosConfig: Omit<AxiosConfig<'/api/v1/admin/system/auth/profile', 'post'>, 'url' | 'method'>,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/auth/profile', 'post'>
>;
export declare const updateProfileFn: (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/updateProfile', 'post'>,
    'url' | 'method'
  >,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/auth/updateProfile', 'post'>
>;
export declare const updatePasswordFn: (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/updatePassword', 'post'>,
    'url' | 'method'
  >,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/auth/updatePassword', 'post'>
>;
export declare const updateLangCodeFn: (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/updateLangCode', 'post'>,
    'url' | 'method'
  >,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/auth/updateLangCode', 'post'>
>;
export declare const getButtonPermissionFn: (
  axiosConfig: Omit<
    AxiosConfig<'/api/v1/admin/system/auth/getButtonPermission', 'post'>,
    'url' | 'method'
  >,
) => Promise<
  Omit<import('axios').AxiosResponse<any, any, {}>, 'data' | 'headers'> &
    import('../../config').ResponseGeneric<'/api/v1/admin/system/auth/getButtonPermission', 'post'>
>;
