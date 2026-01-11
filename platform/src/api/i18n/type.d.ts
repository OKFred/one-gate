import * as TranslationAPI from '@/api/i18n/translation';

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
