import * as MailActionAPI from '@/api/mail/action';

// ==================== 邮件发送相关类型 ====================

// 发送邮件
export type SendMailRequest = NonNullable<Parameters<typeof MailActionAPI.sendFn>[0]['data']>;
export type SendMailResponse = Awaited<ReturnType<typeof MailActionAPI.sendFn>>;
