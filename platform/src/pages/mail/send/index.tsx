
import { useState } from 'react';
import { sendMailSingle } from '@/api/mail';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Stack,
} from '@mui/material';
import NoticeTool from '@/components/NoticeTool';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
export default function MailSend() {
  // All hooks and handlers must be inside the component
  const [form, setForm] = useState({
    senderObj: { accountId: '', mailAddress: '' },
    receiverArr: [{ name: '', address: '' }],
    contentObj: { templateId: '', subject: '', html: '' },
  });
  // 已移除 result, setResult
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleChange = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
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
        setSnackbar({ open: true, message: (res.data?.message as string) || '邮件发送失败', severity: 'error' });
      }
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') ? (err as any).message : '邮件发送失败';
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="发件账户ID"
                value={form.senderObj.accountId}
                onChange={(e) =>
                  handleChange('senderObj', { ...form.senderObj, accountId: e.target.value })
                }
                size="small"
                fullWidth
              />
              <Typography color="text.secondary">或</Typography>
              <TextField
                label="发件邮箱"
                value={form.senderObj.mailAddress}
                onChange={(e) =>
                  handleChange('senderObj', { ...form.senderObj, mailAddress: e.target.value })
                }
                size="small"
                fullWidth
              />
            </Stack>
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
              <TextField
                label="模板ID"
                value={form.contentObj.templateId}
                onChange={(e) =>
                  handleChange('contentObj', { ...form.contentObj, templateId: e.target.value })
                }
                size="small"
                fullWidth
              />
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
            <TextField
              label="内容"
              value={form.contentObj.html}
              onChange={(e) =>
                handleChange('contentObj', { ...form.contentObj, html: e.target.value })
              }
              size="small"
              fullWidth
              multiline
              minRows={3}
            />
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
