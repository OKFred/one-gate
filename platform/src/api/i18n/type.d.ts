import * as TranslationAPI from '@/api/i18n/translation';
import * as RegionAPI from '@/api/i18n/region';

// ==================== Translation ====================

// 获取全部翻译列表
export type ListAllTranslationReq = NonNullable<
  Parameters<typeof TranslationAPI.listAllFn>[0]['data']
>;
export type ListAllTranslationRes = Awaited<
  ReturnType<typeof TranslationAPI.listAllFn>
>['data']['data'];

// 获取翻译列表
export type ListTranslationReq = NonNullable<Parameters<typeof TranslationAPI.listFn>[0]['data']>;
export type ListTranslationRes = Awaited<ReturnType<typeof TranslationAPI.listFn>>['data']['data'];

// 获取单个翻译
export type GetTranslationReq = NonNullable<Parameters<typeof TranslationAPI.getFn>[0]['data']>;
export type GetTranslationRes = Awaited<ReturnType<typeof TranslationAPI.getFn>>['data']['data'];

// 添加翻译
export type AddTranslationReq = NonNullable<Parameters<typeof TranslationAPI.addFn>[0]['data']>;
export type AddTranslationRes = Awaited<ReturnType<typeof TranslationAPI.addFn>>['data']['data'];

// 更新翻译
export type UpdateTranslationReq = NonNullable<
  Parameters<typeof TranslationAPI.updateFn>[0]['data']
>;
export type UpdateTranslationRes = Awaited<
  ReturnType<typeof TranslationAPI.updateFn>
>['data']['data'];

// 删除翻译
export type DeleteTranslationReq = NonNullable<
  Parameters<typeof TranslationAPI.deleteFn>[0]['data']
>;
export type DeleteTranslationRes = Awaited<
  ReturnType<typeof TranslationAPI.deleteFn>
>['data']['data'];

// 检查重复
export type CheckDuplicateTranslationReq = NonNullable<
  Parameters<typeof TranslationAPI.checkDuplicateFn>[0]['data']
>;
export type CheckDuplicateTranslationRes = Awaited<
  ReturnType<typeof TranslationAPI.checkDuplicateFn>
>['data']['data'];

// ==================== Region ====================

// 获取全部地区列表
export type ListAllRegionReq = NonNullable<Parameters<typeof RegionAPI.listAllFn>[0]['data']>;
export type ListAllRegionRes = Awaited<ReturnType<typeof RegionAPI.listAllFn>>['data']['data'];

// 获取地区列表
export type ListRegionReq = NonNullable<Parameters<typeof RegionAPI.listFn>[0]['data']>;
export type ListRegionRes = Awaited<ReturnType<typeof RegionAPI.listFn>>['data']['data'];

// 获取单个地区
export type GetRegionReq = NonNullable<Parameters<typeof RegionAPI.getFn>[0]['data']>;
export type GetRegionRes = Awaited<ReturnType<typeof RegionAPI.getFn>>['data']['data'];

// 添加地区
export type AddRegionReq = NonNullable<Parameters<typeof RegionAPI.addFn>[0]['data']>;
export type AddRegionRes = Awaited<ReturnType<typeof RegionAPI.addFn>>['data']['data'];

// 更新地区
export type UpdateRegionReq = NonNullable<Parameters<typeof RegionAPI.updateFn>[0]['data']>;
export type UpdateRegionRes = Awaited<ReturnType<typeof RegionAPI.updateFn>>['data']['data'];

// 删除地区
export type DeleteRegionReq = NonNullable<Parameters<typeof RegionAPI.deleteFn>[0]['data']>;
export type DeleteRegionRes = Awaited<ReturnType<typeof RegionAPI.deleteFn>>['data']['data'];
