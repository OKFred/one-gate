import { forwardRef, useImperativeHandle, memo } from 'react';
import * as mailActionAPI from '@/api/mail/action';
import { showGlobalNotification } from '@/components/Notification';
import type { SendMailReq } from '@/api/mail/type';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheDataRef {
  /** 发送邮件 */
  send: (data: SendMailReq) => Promise<void>;
}

const TheData = memo(
  forwardRef<TheDataRef, Props>((_, ref) => {
    const t = useTranslation();

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        send: async (data: SendMailReq) => {
          try {
            const SendMailReq: SendMailReq = {
              accountId: Number(data.accountId),
              receiverArr: data.receiverArr,
              templateId: data.templateId && data.templateId ? Number(data.templateId) : undefined,
              subject: data.subject,
              html: data.html,
            };

            const res = await mailActionAPI.sendFn({ data: SendMailReq });
            if (res.data && res.data.ok) {
              let msg = t('mail.send.success');
              if (typeof res.data.data === 'string') {
                msg = res.data.data;
              } else if (typeof res.data.data === 'object' && res.data.data !== null) {
                msg = JSON.stringify(res.data.data);
              }
              showGlobalNotification({ message: msg, type: 'success' });
            } else {
              showGlobalNotification({
                message: (res.data?.message as string) || t('mail.send.failed'),
                type: 'error',
              });
            }
          } catch (err) {
            const msg =
              err &&
              typeof err === 'object' &&
              'message' in err &&
              typeof (err as Error).message === 'string'
                ? (err as Error).message
                : t('mail.send.failed');
            showGlobalNotification({ message: msg, type: 'error' });
          }
        },
      }),
      [t],
    );

    return null; // 这是一个无渲染组件
  }),
);

TheData.displayName = 'TheData';

export default TheData;
