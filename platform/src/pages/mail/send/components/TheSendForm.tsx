import { forwardRef, useImperativeHandle, memo, useRef } from 'react';
import { Box, TextField, Typography, Stack } from '@mui/material';
import JoditEditor from '@/components/JoditEditor/index';
import TheAccountList, { type TheAccountListRef } from './TheAccountList';
import TheRecipientList, { type TheRecipientListRef } from './TheRecipientList';
import TheTemplateSelect, { type TheTemplateSelectRef } from './TheTemplateSelect';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import type { SendMailReq } from '@/api/mail/type';

// 暴露给父组件的方法
export interface TheSendFormRef {
  /** 获取表单数据 */
  getFormData: () => SendMailReq;
  /** 重置表单 */
  reset: () => void;
}

const TheSendForm = memo(
  forwardRef<TheSendFormRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const accountRef = useRef<TheAccountListRef>(null);
    const recipientRef = useRef<TheRecipientListRef>(null);
    const templateRef = useRef<TheTemplateSelectRef>(null);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        getFormData: () => {
          const sender = accountRef.current?.getSender() || { accountId: '', mailAddress: '' };
          const receiverArr = recipientRef.current?.getRecipients() || [];
          const content = templateRef.current?.getContent() || {
            templateId: '',
            subject: '',
            html: '',
          };

          const data: SendMailReq = {
            accountId: Number(sender.accountId),
            receiverArr,
          };

          // 条件添加可选字段
          if (content.templateId) {
            data.templateId = Number(content.templateId);
          }
          if (content.subject) {
            data.subject = content.subject;
          }
          if (content.html) {
            data.html = content.html;
          }

          return data;
        },
        reset: () => {
          accountRef.current?.setSender({ accountId: '', mailAddress: '' });
          recipientRef.current?.setRecipients([{ name: '', address: '' }]);
          templateRef.current?.setContent({
            templateId: '',
            subject: '',
            html: '',
          });
        },
      }),
      [],
    );

    return (
      <Stack spacing={2}>
        {/* 发件人选择 */}
        <TheAccountList ref={accountRef} localObj={localObj} />

        {/* 收件人列表 */}
        <TheRecipientList ref={recipientRef} localObj={localObj} />

        {/* 邮件模板选择和内容 */}
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <TheTemplateSelect ref={templateRef} localObj={localObj} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                label={t('mail.send.form.subject')}
                onChange={(e) => templateRef.current?.setContent({ subject: e.target.value })}
                size="small"
                fullWidth
              />
            </Box>
          </Stack>
        </Box>

        {/* 邮件内容编辑器 */}
        <Box>
          <Typography fontWeight={500} mb={1}>
            {t('mail.send.form.contentLabel')}
          </Typography>
          <JoditEditor
            value={templateRef.current?.getContent().html || ''}
            onChange={(html) => templateRef.current?.setContent({ html })}
            placeholder={t('mail.send.form.content.empty')}
            height={400}
          />
        </Box>
      </Stack>
    );
  }),
);

TheSendForm.displayName = 'TheSendForm';

export default TheSendForm;
