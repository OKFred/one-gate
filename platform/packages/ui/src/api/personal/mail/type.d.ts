import * as PreferenceAPI from '@/api/personal/mail/preference';

// 获取个人通知偏好配置
export type GetMailPreferenceReq = Parameters<typeof PreferenceAPI.getFn>[0] extends undefined
  ? undefined
  : NonNullable<Parameters<typeof PreferenceAPI.getFn>[0]>['data'];
export type GetMailPreferenceRes = Awaited<ReturnType<typeof PreferenceAPI.getFn>>['data']['data'];

// 更新个人通知偏好配置
export type UpdateMailPreferenceReq = NonNullable<
  Parameters<typeof PreferenceAPI.updateFn>[0]['data']
>;
export type UpdateMailPreferenceRes = Awaited<
  ReturnType<typeof PreferenceAPI.updateFn>
>['data']['data'];
