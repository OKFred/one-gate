import * as MailAccountAPI from '@/api/mail/account';

// 获取邮件账户列表
export type ListMailAccountReq = NonNullable<Parameters<typeof MailAccountAPI.listFn>[0]['data']>;
export type ListMailAccountRes = Awaited<ReturnType<typeof MailAccountAPI.listFn>>['data']['data'];

// 获取单个邮件账户
export type GetMailAccountReq = NonNullable<Parameters<typeof MailAccountAPI.getFn>[0]['data']>;
export type GetMailAccountRes = Awaited<ReturnType<typeof MailAccountAPI.getFn>>['data']['data'];

// 添加邮件账户
export type AddMailAccountReq = NonNullable<Parameters<typeof MailAccountAPI.addFn>[0]['data']>;
export type AddMailAccountRes = Awaited<ReturnType<typeof MailAccountAPI.addFn>>['data']['data'];

// 更新邮件账户
export type UpdateMailAccountReq = NonNullable<Parameters<typeof MailAccountAPI.updateFn>[0]['data']>;
export type UpdateMailAccountRes = Awaited<ReturnType<typeof MailAccountAPI.updateFn>>['data']['data'];

// 删除邮件账户
export type DeleteMailAccountReq = NonNullable<Parameters<typeof MailAccountAPI.deleteFn>[0]['data']>;
export type DeleteMailAccountRes = Awaited<ReturnType<typeof MailAccountAPI.deleteFn>>['data']['data'];
