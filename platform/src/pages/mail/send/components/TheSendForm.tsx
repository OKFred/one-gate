import { forwardRef, useImperativeHandle, memo, useRef, useState, lazy, Suspense } from 'react';
import { Box, TextField, Typography, Stack, CircularProgress } from '@mui/material';
import TheAccountList, { type TheAccountListRef } from './TheAccountList';
import TheRecipientList, { type TheRecipientListRef } from './TheRecipientList';
import TheTemplateSelect from './TheTemplateSelect';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import type { SendMailReq } from '@/api/mail/type';

// 动态导入 JoditEditor，实现代码分割
const JoditEditor = lazy(() => import('@/components/JoditEditor/index'));

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

    // 邮件内容状态管理
    const [templateId, setTemplateId] = useState<number | 'none'>('none');
    const [subject, setSubject] = useState<string>('');
    const [html, setHtml] = useState<string>('');

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        getFormData: () => {
          const sender = accountRef.current?.getSender() || { accountId: '', mailAddress: '' };
          const receiverArr = recipientRef.current?.getRecipients() || [];

          const data: SendMailReq = {
            accountId: Number(sender.accountId),
            receiverArr,
          };

          // 条件添加可选字段
          if (templateId !== 'none') {
            data.templateId = templateId;
          }
          if (subject) {
            data.subject = subject;
          }
          if (html) {
            data.html = html;
          }

          return data;
        },
        reset: () => {
          accountRef.current?.setSender({ accountId: '', mailAddress: '' });
          recipientRef.current?.setRecipients([{ name: '', address: '' }]);
          setTemplateId('none');
          setSubject('');
          setHtml('');
        },
      }),
      [templateId, subject, html],
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
              <TextField
                label={t('send.dialog.subject')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TheTemplateSelect
                localObj={localObj}
                value={templateId !== 'none' ? templateId.toString() : 'none'}
                onTemplateChange={(id, templateSubject, templateHtml) => {
                  setTemplateId(id !== undefined ? id : 'none');
                  setSubject(templateSubject);
                  setHtml(templateHtml);
                }}
              />
            </Box>
          </Stack>
        </Box>

        {/* 邮件内容编辑器 */}
        <Box>
          <Typography fontWeight={500} mb={1}>
            {t('send.dialog.contentLabel')}
          </Typography>
          <Suspense
            fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            }
          >
            <JoditEditor
              value={html}
              onChange={setHtml}
              placeholder={t('form.pleaseEnter')}
              height={400}
            />
          </Suspense>
        </Box>
      </Stack>
    );
  }),
);

TheSendForm.displayName = 'TheSendForm';

export default TheSendForm;
