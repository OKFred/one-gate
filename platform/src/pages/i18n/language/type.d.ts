import * as LanguageAPI from '@/api/i18n/language';

export interface Props {
  localObj: LocalObj;
}

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListLanguageRequest['orderBy']>;
  descend: boolean;
  application?: string;
  business?: string;
  langCode?: string;
  isEnabled?: boolean;
}

// 获取翻译列表
export type ListLanguageRequest = NonNullable<Parameters<typeof LanguageAPI.listFn>[0]['data']>;
export type ListLanguageResponse = Awaited<ReturnType<typeof LanguageAPI.listFn>>;
export type ListLanguages = NonNullable<ListLanguageResponse['data']['data']['list']>;
export type ListLanguage = ListLanguages[number];

// 获取单个翻译
export type GetLanguageRequest = NonNullable<Parameters<typeof LanguageAPI.getFn>[0]['data']>;
export type GetLanguageResponse = Awaited<ReturnType<typeof LanguageAPI.getFn>>;
export type GetLanguage = NonNullable<GetLanguageResponse['data']>;

// 添加翻译
export type AddLanguageRequest = NonNullable<Parameters<typeof LanguageAPI.addFn>[0]['data']>;
export type AddLanguageResponse = Awaited<ReturnType<typeof LanguageAPI.addFn>>;

// 更新翻译
export type UpdateLanguageRequest = NonNullable<Parameters<typeof LanguageAPI.updateFn>[0]['data']>;
export type UpdateLanguageResponse = Awaited<ReturnType<typeof LanguageAPI.updateFn>>;

// 删除翻译
export type DeleteLanguageRequest = NonNullable<Parameters<typeof LanguageAPI.deleteFn>[0]['data']>;
export type DeleteLanguageResponse = Awaited<ReturnType<typeof LanguageAPI.deleteFn>>;

// 检查重复
export type CheckDuplicateLanguageRequest = NonNullable<
  Parameters<typeof LanguageAPI.checkDuplicateFn>[0]['data']
>;
export type CheckDuplicateLanguageResponse = Awaited<ReturnType<typeof LanguageAPI.checkDuplicateFn>>;
