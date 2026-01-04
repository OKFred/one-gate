import * as I18nAPI from '@/api/system/i18n';

export interface Props {
  localObj: LocalObj;
}

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListI18nRequest['orderBy']>;
  descend: boolean;
  namespace?: string;
  langCode?: string;
}

// 获取翻译列表
export type ListI18nRequest = NonNullable<Parameters<typeof I18nAPI.listFn>[0]['data']>;
export type ListI18nResponse = Awaited<ReturnType<typeof I18nAPI.listFn>>;
export type ListI18ns = NonNullable<ListI18nResponse['data']['data']['list']>;
export type ListI18n = ListI18ns[number];

// 获取单个翻译
export type GetI18nRequest = NonNullable<Parameters<typeof I18nAPI.getFn>[0]['data']>;
export type GetI18nResponse = Awaited<ReturnType<typeof I18nAPI.getFn>>;
export type GetI18n = NonNullable<GetI18nResponse['data']>;

// 添加翻译
export type AddI18nRequest = NonNullable<Parameters<typeof I18nAPI.addFn>[0]['data']>;
export type AddI18nResponse = Awaited<ReturnType<typeof I18nAPI.addFn>>;

// 更新翻译
export type UpdateI18nRequest = NonNullable<Parameters<typeof I18nAPI.updateFn>[0]['data']>;
export type UpdateI18nResponse = Awaited<ReturnType<typeof I18nAPI.updateFn>>;

// 删除翻译
export type DeleteI18nRequest = NonNullable<Parameters<typeof I18nAPI.deleteFn>[0]['data']>;
export type DeleteI18nResponse = Awaited<ReturnType<typeof I18nAPI.deleteFn>>;

// 检查重复
export type CheckDuplicateI18nRequest = NonNullable<
  Parameters<typeof I18nAPI.checkDuplicateFn>[0]['data']
>;
export type CheckDuplicateI18nResponse = Awaited<ReturnType<typeof I18nAPI.checkDuplicateFn>>;
