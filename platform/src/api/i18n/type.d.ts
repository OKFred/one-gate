import * as LanguageAPI from '@/api/i18n/language';

// 获取翻译列表
export type ListLanguageReq = NonNullable<Parameters<typeof LanguageAPI.listFn>[0]['data']>;
export type ListLanguageRes = Awaited<ReturnType<typeof LanguageAPI.listFn>>['data']['data'];

// 获取单个翻译
export type GetLanguageReq = NonNullable<Parameters<typeof LanguageAPI.getFn>[0]['data']>;
export type GetLanguageRes = Awaited<ReturnType<typeof LanguageAPI.getFn>>['data']['data'];

// 添加翻译
export type AddLanguageReq = NonNullable<Parameters<typeof LanguageAPI.addFn>[0]['data']>;
export type AddLanguageRes = Awaited<ReturnType<typeof LanguageAPI.addFn>>['data']['data'];

// 更新翻译
export type UpdateLanguageReq = NonNullable<Parameters<typeof LanguageAPI.updateFn>[0]['data']>;
export type UpdateLanguageRes = Awaited<ReturnType<typeof LanguageAPI.updateFn>>['data']['data'];

// 删除翻译
export type DeleteLanguageReq = NonNullable<Parameters<typeof LanguageAPI.deleteFn>[0]['data']>;
export type DeleteLanguageRes = Awaited<ReturnType<typeof LanguageAPI.deleteFn>>['data']['data'];

// 检查重复
export type CheckDuplicateLanguageReq = NonNullable<
  Parameters<typeof LanguageAPI.checkDuplicateFn>[0]['data']
>;
export type CheckDuplicateLanguageRes = Awaited<
  ReturnType<typeof LanguageAPI.checkDuplicateFn>
>['data']['data'];
