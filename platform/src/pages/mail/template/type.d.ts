import * as MailTemplateAPI from '@/api/mail/template';

// ==================== 邮件模板相关类型 ====================

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailTemplateRequest['orderBy']>;
  descend: boolean;
}

// 获取邮件模板列表
export type ListMailTemplateRequest = NonNullable<Parameters<typeof MailTemplateAPI.listFn>[0]['data']>;
export type ListMailTemplateResponse = Awaited<ReturnType<typeof MailTemplateAPI.listFn>>;
export type ListMailTemplates = NonNullable<ListMailTemplateResponse['data']['data']['list']>;
export type ListMailTemplate = ListMailTemplates[number];

// 获取单个邮件模板
export type GetMailTemplateRequest = NonNullable<Parameters<typeof MailTemplateAPI.getFn>[0]['data']>;
export type GetMailTemplateResponse = Awaited<ReturnType<typeof MailTemplateAPI.getFn>>;
export type GetMailTemplate = NonNullable<GetMailTemplateResponse['data']>;

// 添加邮件模板
export type AddMailTemplateRequest = NonNullable<Parameters<typeof MailTemplateAPI.addFn>[0]['data']>;
export type AddMailTemplateResponse = Awaited<ReturnType<typeof MailTemplateAPI.addFn>>;

// 更新邮件模板
export type UpdateMailTemplateRequest = NonNullable<Parameters<typeof MailTemplateAPI.updateFn>[0]['data']>;
export type UpdateMailTemplateResponse = Awaited<ReturnType<typeof MailTemplateAPI.updateFn>>;

// 删除邮件模板
export type DeleteMailTemplateRequest = NonNullable<Parameters<typeof MailTemplateAPI.deleteFn>[0]['data']>;
export type DeleteMailTemplateResponse = Awaited<ReturnType<typeof MailTemplateAPI.deleteFn>>;
