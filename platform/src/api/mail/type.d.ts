import * as AccountAPI from '@/api/mail/account';
import * as TemplateAPI from '@/api/mail/template';
import * as LogAPI from '@/api/mail/log';
import * as ActionAPI from '@/api/mail/action';

// 获取邮件账户列表
export type ListMailAccountReq = NonNullable<Parameters<typeof AccountAPI.listFn>[0]['data']>;
export type ListMailAccountRes = Awaited<ReturnType<typeof AccountAPI.listFn>>['data']['data'];

// 获取单个邮件账户
export type GetMailAccountReq = NonNullable<Parameters<typeof AccountAPI.getFn>[0]['data']>;
export type GetMailAccountRes = Awaited<ReturnType<typeof AccountAPI.getFn>>['data']['data'];

// 添加邮件账户
export type AddMailAccountReq = NonNullable<Parameters<typeof AccountAPI.addFn>[0]['data']>;
export type AddMailAccountRes = Awaited<ReturnType<typeof AccountAPI.addFn>>['data']['data'];

// 更新邮件账户
export type UpdateMailAccountReq = NonNullable<Parameters<typeof AccountAPI.updateFn>[0]['data']>;
export type UpdateMailAccountRes = Awaited<ReturnType<typeof AccountAPI.updateFn>>['data']['data'];

// 删除邮件账户
export type DeleteMailAccountReq = NonNullable<Parameters<typeof AccountAPI.deleteFn>[0]['data']>;
export type DeleteMailAccountRes = Awaited<ReturnType<typeof AccountAPI.deleteFn>>['data']['data'];

// 获取邮件模板列表
export type ListMailTemplateReq = NonNullable<Parameters<typeof TemplateAPI.listFn>[0]['data']>;
export type ListMailTemplateRes = Awaited<ReturnType<typeof TemplateAPI.listFn>>['data']['data'];

// 添加邮件模板
export type AddMailTemplateReq = NonNullable<Parameters<typeof TemplateAPI.addFn>[0]['data']>;
export type AddMailTemplateRes = Awaited<ReturnType<typeof TemplateAPI.addFn>>['data']['data'];

// 更新邮件模板
export type UpdateMailTemplateReq = NonNullable<Parameters<typeof TemplateAPI.updateFn>[0]['data']>;
export type UpdateMailTemplateRes = Awaited<
  ReturnType<typeof TemplateAPI.updateFn>
>['data']['data'];

// 删除邮件模板
export type DeleteMailTemplateReq = NonNullable<Parameters<typeof TemplateAPI.deleteFn>[0]['data']>;
export type DeleteMailTemplateRes = Awaited<
  ReturnType<typeof TemplateAPI.deleteFn>
>['data']['data'];

// 获取邮件日志列表
export type ListMailLogReq = NonNullable<Parameters<typeof LogAPI.listFn>[0]['data']>;
export type ListMailLogRes = Awaited<ReturnType<typeof LogAPI.listFn>>['data']['data'];

// 发送邮件
export type SendMailReq = NonNullable<Parameters<typeof ActionAPI.sendFn>[0]['data']>;
export type SendMailRes = Awaited<ReturnType<typeof ActionAPI.sendFn>>['data']['data'];
