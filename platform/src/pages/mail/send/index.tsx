import { useState, useEffect } from 'react';
import { sendMailSingle, listMailAccount, listMailTemplate } from '@/api/mail';
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
import NoticeTool from '@/components/NoticeTool';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import FroalaEditor from '@/components/FroalaEditor';

interface MailAccount {
  id?: number;
  mailAddress?: string;
  nickname?: string;
  accountOwner?: string;
}

interface MailTemplate {
  id?: number;
  name?: string;
  title?: string;
  langCode?: string;
  content?: string;
  creatorName?: string;
  category?: string;
}

export default function MailSend() {
  // 邮箱账户列表
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  // 邮件模板列表
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  // All hooks and handlers must be inside the component
  const [form, setForm] = useState({
    senderObj: { accountId: '', mailAddress: '' },
    receiverArr: [{ name: '', address: '' }],
    contentObj: { templateId: '', subject: '', html: '' },
  });
  // 已移除 result, setResult
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // 获取邮箱账户列表
  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true);
      try {
        const res = await listMailAccount({
          data: {
            pageNo: 1,
            pageSize: 100,
          },
        });
        const response = res.data as { data?: { list?: MailAccount[]; total?: number } };
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
        const res = await listMailTemplate({
          data: {
            pageNo: 1,
            pageSize: 100,
          },
        });
        const response = res.data as { data?: { list?: MailTemplate[]; total?: number } };
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
      setForm((f) => ({
        ...f,
        contentObj: {
          templateId: selectedTemplateId,
          subject: selectedTemplate.title || f.contentObj.subject,
          html: selectedTemplate.content || f.contentObj.html,
        },
      }));
    } else {
      // 清除模板选择时，保留当前的主题和内容
      setForm((f) => ({
        ...f,
        contentObj: {
          ...f.contentObj,
          templateId: '',
        },
      }));
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
      // Only one of accountId or mailAddress should be set, the other must be undefined
      const senderObj = (() => {
        if (form.senderObj.accountId && form.senderObj.accountId !== '') {
          return { accountId: Number(form.senderObj.accountId), mailAddress: undefined };
        } else if (form.senderObj.mailAddress && form.senderObj.mailAddress !== '') {
          return { accountId: undefined, mailAddress: form.senderObj.mailAddress };
        } else {
          return { accountId: undefined, mailAddress: undefined };
        }
      })();
      const payload = {
        ...form,
        senderObj,
        contentObj: {
          ...form.contentObj,
          templateId:
            form.contentObj.templateId && form.contentObj.templateId !== ''
              ? Number(form.contentObj.templateId)
              : undefined,
        },
      };
      const res = await sendMailSingle({ data: payload });
      if (res.data && res.data.ok) {
        let msg = '邮件发送成功';
        if (typeof res.data.data === 'string') {
          msg = res.data.data;
        } else if (typeof res.data.data === 'object' && res.data.data !== null) {
          msg = JSON.stringify(res.data.data);
        }
        setSnackbar({ open: true, message: msg, severity: 'success' });
      } else {
        setSnackbar({
          open: true,
          message: (res.data?.message as string) || '邮件发送失败',
          severity: 'error',
        });
      }
    } catch (err) {
      const msg =
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as Error).message === 'string'
          ? (err as Error).message
          : '邮件发送失败';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          发送邮件
        </Typography>
        <Box component="form" onSubmit={handleSubmit} autoComplete="off">
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="account-select-label">选择发件账户</InputLabel>
              <Select
                labelId="account-select-label"
                id="account-select"
                value={form.senderObj.accountId}
                label="选择发件账户"
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
                        {account.mailAddress} ({account.accountOwner})
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!form.senderObj.accountId && (
              <TextField
                label="或直接输入发件邮箱"
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
                helperText="如果没有配置的账户，可以直接输入邮箱地址"
              />
            )}
            <Box>
              <Typography fontWeight={500} mb={1}>
                收件人
              </Typography>
              <Stack spacing={1}>
                {form.receiverArr.map((r, i) => (
                  <Stack direction="row" spacing={1} alignItems="center" key={i}>
                    <TextField
                      placeholder="姓名"
                      value={r.name}
                      onChange={(e) => handleReceiverChange(i, 'name', e.target.value)}
                      required
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      placeholder="邮箱"
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
                        aria-label="移除收件人"
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
                  添加收件人
                </Button>
              </Stack>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="template-select-label">选择邮件模板</InputLabel>
                <Select
                  labelId="template-select-label"
                  id="template-select"
                  value={form.contentObj.templateId}
                  label="选择邮件模板"
                  onChange={handleTemplateSelect}
                  disabled={templatesLoading}
                >
                  <MenuItem value="">
                    <Typography variant="body2" color="text.secondary">
                      不使用模板 - 手动编写内容
                    </Typography>
                  </MenuItem>
                  {mailTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id?.toString() || ''}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {template.title || template.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          模板名: {template.name} | 创建者: {template.creatorName}
                          {template.category && ` | 分类: ${template.category}`}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="主题"
                value={form.contentObj.subject}
                onChange={(e) =>
                  handleChange('contentObj', { ...form.contentObj, subject: e.target.value })
                }
                size="small"
                fullWidth
              />
            </Stack>
            <Box>
              <Typography fontWeight={500} mb={1}>
                邮件内容
              </Typography>
              {form.contentObj.templateId && (
                <Typography variant="body2" color="info.main" mb={1}>
                  已选择模板，内容已自动填充，您可以在此基础上继续编辑
                </Typography>
              )}
              <FroalaEditor
                value={form.contentObj.html}
                onChange={(html) => handleChange('contentObj', { ...form.contentObj, html })}
                placeholder={
                  form.contentObj.templateId
                    ? '模板内容已加载，您可以在此基础上编辑...'
                    : '请输入邮件内容或选择上方的邮件模板...'
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
              {loading ? '发送中...' : '发送'}
            </Button>
          </Stack>
        </Box>
        <NoticeTool
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        />
      </Paper>
    </Box>
  );
}
