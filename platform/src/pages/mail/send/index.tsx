import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import * as AccountAPI from '@/api/mail/account';
import * as mailTemplateAPI from '@/api/mail/template';
import * as mailActionAPI from '@/api/mail/action';
import { showGlobalNotification } from '@/components/Notification';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import JoditEditor from '@/components/JoditEditor/index';
import type { ListMailAccount } from '../account/type';
import type { ListMailTemplate } from '../template/type';
import type { SendMailRequest } from './type';

export default function MailSend() {
  const t = useTranslation();
  // 邮箱账户列表
  const [mailAccounts, setMailAccounts] = useState<ListMailAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  // 邮件模板列表
  const [mailTemplates, setMailTemplates] = useState<ListMailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  // All hooks and handlers must be inside the component
  const [form, setForm] = useState({
    senderObj: { accountId: '', mailAddress: '' },
    receiverArr: [{ name: '', address: '' }],
    contentObj: { templateId: '', subject: '', html: '' },
  });
  // 记录原始模板内容，用于检测用户是否修改了内容
  const [originalTemplate, setOriginalTemplate] = useState<{
    subject: string;
    html: string;
  } | null>(null);
  // 已移除 result, setResult
  const [loading, setLoading] = useState(false);

  // 获取邮箱账户列表
  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true);
      try {
        const res = await AccountAPI.listFn({
          data: {
            pageNo: 1,
            pageSize: 100,
          },
        });
        const response = res.data;
        if (res.data?.ok && response?.data?.list) {
          setMailAccounts(response.data.list);
        }
      } catch (error) {
        console.error('获取邮箱账户列表失败:', error);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // 获取邮件模板列表
  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const res = await mailTemplateAPI.listFn({
          data: {
            pageNo: 1,
            pageSize: 100,
          },
        });
        const response = res.data;
        if (res.data?.ok && response?.data?.list) {
          setMailTemplates(response.data.list);
        }
      } catch (error) {
        console.error('获取邮件模板列表失败:', error);
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleChange = (field: string, value: unknown) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  // 处理主题变化，检测是否与原始模板不同
  const handleSubjectChange = (newSubject: string) => {
    const newContentObj = { ...form.contentObj, subject: newSubject };

    // 如果有模板ID且内容已被修改，则清除模板ID
    if (form.contentObj.templateId && originalTemplate) {
      const isSubjectChanged = newSubject !== originalTemplate.subject;
      const isHtmlChanged = form.contentObj.html !== originalTemplate.html;

      if (isSubjectChanged || isHtmlChanged) {
        newContentObj.templateId = '';
      }
    }

    setForm((f) => ({ ...f, contentObj: newContentObj }));
  };

  // 处理内容变化，检测是否与原始模板不同
  const handleHtmlChange = (newHtml: string) => {
    const newContentObj = { ...form.contentObj, html: newHtml };

    // 如果有模板ID且内容已被修改，则清除模板ID
    if (form.contentObj.templateId && originalTemplate) {
      const isSubjectChanged = form.contentObj.subject !== originalTemplate.subject;
      const isHtmlChanged = newHtml !== originalTemplate.html;

      if (isSubjectChanged || isHtmlChanged) {
        newContentObj.templateId = '';
      }
    }

    setForm((f) => ({ ...f, contentObj: newContentObj }));
  };

  const handleAccountSelect = (event: SelectChangeEvent<string>) => {
    const selectedAccountId = event.target.value;
    const selectedAccount = mailAccounts.find((acc) => acc.id?.toString() === selectedAccountId);

    if (selectedAccount) {
      setForm((f) => ({
        ...f,
        senderObj: {
          accountId: selectedAccountId,
          mailAddress: '', // 清空邮箱地址，因为选择了账户ID
        },
      }));
    }
  };

  const handleTemplateSelect = (event: SelectChangeEvent<string>) => {
    const selectedTemplateId = event.target.value;
    const selectedTemplate = mailTemplates.find(
      (template) => template.id?.toString() === selectedTemplateId,
    );

    if (selectedTemplate) {
      const templateSubject = selectedTemplate.title || '';
      const templateHtml = selectedTemplate.content || '';

      setForm((f) => ({
        ...f,
        contentObj: {
          templateId: selectedTemplateId,
          subject: templateSubject,
          html: templateHtml,
        },
      }));

      // 记录原始模板内容
      setOriginalTemplate({
        subject: templateSubject,
        html: templateHtml,
      });
    } else {
      // 清除模板选择时，也清除原始模板记录
      setForm((f) => ({
        ...f,
        contentObj: {
          ...f.contentObj,
          subject: '',
          html: '',
          templateId: '',
        },
      }));
      setOriginalTemplate(null);
    }
  };

  const handleReceiverChange = (idx: number, key: string, value: string) => {
    setForm((f) => ({
      ...f,
      receiverArr: f.receiverArr.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    }));
  };

  const handleAddReceiver = () => {
    setForm((f) => ({ ...f, receiverArr: [...f.receiverArr, { name: '', address: '' }] }));
  };

  const handleRemoveReceiver = (idx: number) => {
    setForm((f) => ({ ...f, receiverArr: f.receiverArr.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: SendMailRequest = {
        accountId: Number(form.senderObj.accountId),
        receiverArr: form.receiverArr,
        templateId:
          form.contentObj.templateId && form.contentObj.templateId !== ''
            ? Number(form.contentObj.templateId)
            : undefined,
        subject: form.contentObj.subject,
        html: form.contentObj.html,
      };

      const res = await mailActionAPI.sendFn({ data });
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          {t('mail.send.title')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit} autoComplete="off">
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="account-select-label">{t('mail.send.form.selectAccount')}</InputLabel>
              <Select
                labelId="account-select-label"
                id="account-select"
                value={form.senderObj.accountId}
                label={t('mail.send.form.selectAccount')}
                onChange={handleAccountSelect}
                disabled={accountsLoading}
              >
                {mailAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id?.toString() || ''}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {account.nickname || account.mailAddress}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {account.mailAddress}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!form.senderObj.accountId && (
              <TextField
                label={t('mail.send.form.customFrom')}
                value={form.senderObj.mailAddress}
                onChange={(e) =>
                  handleChange('senderObj', {
                    ...form.senderObj,
                    mailAddress: e.target.value,
                    accountId: '',
                  })
                }
                size="small"
                fullWidth
                helperText={t('mail.send.form.customFromHelp')}
              />
            )}
            <Box>
              <Typography fontWeight={500} mb={1}>
                {t('mail.send.recipients')}
              </Typography>
              <Stack spacing={1}>
                {form.receiverArr.map((r, i) => (
                  <Stack direction="row" spacing={1} alignItems="center" key={i}>
                    <TextField
                      placeholder={t('mail.send.form.recipientName')}
                      value={r.name}
                      onChange={(e) => handleReceiverChange(i, 'name', e.target.value)}
                      required
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      placeholder={t('mail.send.form.recipientEmail')}
                      value={r.address}
                      onChange={(e) => handleReceiverChange(i, 'address', e.target.value)}
                      required
                      size="small"
                      sx={{ flex: 2 }}
                    />
                    {form.receiverArr.length > 1 && (
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveReceiver(i)}
                        aria-label={t('mail.send.form.removeRecipient')}
                        size="small"
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    )}
                  </Stack>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddReceiver}
                  sx={{ mt: 1, width: 180 }}
                >
                  {t('mail.send.addRecipient')}
                </Button>
              </Stack>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="template-select-label">{t('mail.send.form.selectTemplate')}</InputLabel>
                <Select
                  labelId="template-select-label"
                  id="template-select"
                  value={form.contentObj.templateId}
                  label={t('mail.send.form.selectTemplate')}
                  onChange={handleTemplateSelect}
                  disabled={templatesLoading}
                >
                  <MenuItem value="">
                    <Typography variant="body2" color="text.secondary">
                      {t('mail.send.noTemplate')}
                    </Typography>
                  </MenuItem>
                  {mailTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id?.toString() || ''}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {template.title || template.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('mail.send.templateName')}: {template.name} | {t('mail.send.creator')}: {template.creatorName}
                          {template.category && ` | ${t('mail.send.category')}: ${template.category}`}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label={t('mail.send.form.subject')}
                value={form.contentObj.subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <Box>
              <Typography fontWeight={500} mb={1}>
                {t('mail.send.form.contentLabel')}
              </Typography>
              {form.contentObj.templateId && (
                <Typography variant="body2" color="info.main" mb={1}>
                  {t('mail.send.templateSelectedInfo')}
                </Typography>
              )}
              <JoditEditor
                value={form.contentObj.html}
                onChange={handleHtmlChange}
                placeholder={
                  form.contentObj.templateId
                    ? t('mail.send.form.content.loaded')
                    : t('mail.send.form.content.empty')
                }
                height={400}
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 2 }}
              fullWidth
            >
              {loading ? t('mail.send.action.sending') : t('mail.send.action.send')}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
