import * as EdmAPI from '@/api/enterprise/mail/edm';

// 批量下发 EDM 营销邮件
export type SendBatchEdmMailReq = NonNullable<Parameters<typeof EdmAPI.sendBatchFn>[0]['data']>;
export type SendBatchEdmMailRes = Awaited<ReturnType<typeof EdmAPI.sendBatchFn>>['data']['data'];
