import * as MailLogAPI from '@/api/mail/log';

// ==================== 邮件日志相关类型 ====================

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailLogRequest['orderBy']>;
  descend: boolean;
}

// 获取邮件日志列表
export type ListMailLogRequest = NonNullable<Parameters<typeof MailLogAPI.listFn>[0]['data']>;
export type ListMailLogResponse = Awaited<ReturnType<typeof MailLogAPI.listFn>>;
export type ListMailLogs = NonNullable<ListMailLogResponse['data']['data']['list']>;
export type ListMailLog = ListMailLogs[number];
