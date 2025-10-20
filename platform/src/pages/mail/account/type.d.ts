/**
 * 邮件账户管理类型定义
 * 从 API 函数中提取类型
 */

import type * as MailAPI from '@/api/mail';

// ==================== 邮件账户相关类型 ====================

// 获取邮件账户列表
export type ListMailAccountParams = Parameters<typeof MailAPI.listMailAccount>[0];
export type ListMailAccountResponse = Awaited<ReturnType<typeof MailAPI.listMailAccount>>;
export type ListMailAccountReq = NonNullable<ListMailAccountParams['data']>;
export type ListMailAccountData = NonNullable<ListMailAccountResponse['data']>;
export type MailAccountList = NonNullable<ListMailAccountData['list']>;
export type MailAccount = MailAccountList[number];

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailAccountReq['orderBy']>;
  descend: boolean;
}

// 获取单个邮件账户
export type GetMailAccountParams = Parameters<typeof MailAPI.getMailAccount>[0];
export type GetMailAccountResponse = Awaited<ReturnType<typeof MailAPI.getMailAccount>>;
export type GetMailAccountReq = NonNullable<GetMailAccountParams['data']>;
export type GetMailAccountData = NonNullable<GetMailAccountResponse['data']>;

// 添加邮件账户
export type AddMailAccountParams = Parameters<typeof MailAPI.addMailAccount>[0];
export type AddMailAccountResponse = Awaited<ReturnType<typeof MailAPI.addMailAccount>>;
export type AddMailAccountReq = NonNullable<AddMailAccountParams['data']>;
export type AddMailAccountData = NonNullable<AddMailAccountResponse['data']>;

// 更新邮件账户
export type UpdateMailAccountParams = Parameters<typeof MailAPI.updateMailAccount>[0];
export type UpdateMailAccountResponse = Awaited<ReturnType<typeof MailAPI.updateMailAccount>>;
export type UpdateMailAccountReq = NonNullable<UpdateMailAccountParams['data']>;
export type UpdateMailAccountData = NonNullable<UpdateMailAccountResponse['data']>;

// 删除邮件账户
export type DeleteMailAccountParams = Parameters<typeof MailAPI.deleteMailAccount>[0];
export type DeleteMailAccountResponse = Awaited<ReturnType<typeof MailAPI.deleteMailAccount>>;
export type DeleteMailAccountReq = NonNullable<DeleteMailAccountParams['data']>;
export type DeleteMailAccountData = NonNullable<DeleteMailAccountResponse['data']>;

// 验证邮件账户
export type VerifyMailAccountParams = Parameters<typeof MailAPI.verifyMailAccount>[0];
export type VerifyMailAccountResponse = Awaited<ReturnType<typeof MailAPI.verifyMailAccount>>;
export type VerifyMailAccountReq = NonNullable<VerifyMailAccountParams['data']>;
export type VerifyMailAccountData = NonNullable<VerifyMailAccountResponse['data']>;

// ==================== 表单相关类型 ====================

// 邮件账户表单数据（用于前端表单，port 为字符串）
export interface MailAccountFormData {
  nickname: string;
  mailAddress: string;
  host: string;
  port: string; // 前端表单中 port 是字符串
  password: string;
  sslEnable: boolean;
  starttlsEnable: boolean;
}
