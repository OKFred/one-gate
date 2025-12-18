import * as MailAPI from '@/api/mail/account';

// ==================== 邮件账户相关类型 ====================

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailAccountRequest['orderBy']>;
  descend: boolean;
}

// 获取邮件账户列表
export type ListMailAccountRequest = NonNullable<Parameters<typeof MailAPI.listFn>[0]['data']>;
export type ListMailAccountResponse = Awaited<ReturnType<typeof MailAPI.listFn>>;
export type ListMailAccounts = NonNullable<ListMailAccountResponse['data']['data']['list']>;
export type ListMailAccount = ListMailAccounts[number];

// 获取单个邮件账户
export type GetMailAccountRequest = NonNullable<Parameters<typeof MailAPI.getFn>[0]['data']>;
export type GetMailAccountResponse = Awaited<ReturnType<typeof MailAPI.getFn>>;
export type GetMailAccount = NonNullable<GetMailAccountResponse['data']>;

// 添加邮件账户
export type AddMailAccountRequest = NonNullable<Parameters<typeof MailAPI.addFn>[0]['data']>;
export type AddMailAccountResponse = Awaited<ReturnType<typeof MailAPI.addFn>>;

// 更新邮件账户
export type UpdateMailAccountRequest = NonNullable<Parameters<typeof MailAPI.updateFn>[0]['data']>;
export type UpdateMailAccountResponse = Awaited<ReturnType<typeof MailAPI.updateFn>>;

// 删除邮件账户
export type DeleteMailAccountRequest = NonNullable<Parameters<typeof MailAPI.deleteFn>[0]['data']>;
export type DeleteMailAccountResponse = Awaited<ReturnType<typeof MailAPI.deleteFn>>;
