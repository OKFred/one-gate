import { forwardRef, useImperativeHandle, memo } from 'react';
import * as mailActionAPI from '@/api/mail/action';
import { showSnackbar } from '@/components/Notification';
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
            await mailActionAPI.sendFn({ data: SendMailReq });
            showSnackbar({
              message: t('common.interact.operationSuccess'),
              type: 'success',
            });
          } catch (error) {
            console.warn(error);
          }
        },
      }),
      [t],
    );
    return null; // 这是一个无渲染组件
  }),
);

export default TheData;
