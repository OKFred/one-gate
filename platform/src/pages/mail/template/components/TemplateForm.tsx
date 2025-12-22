import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Box,
  useTheme,
  useMediaQuery,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import JoditEditor from '@/components/JoditEditor/index';
import type { AddMailTemplateRequest } from '../type';

interface FormData extends AddMailTemplateRequest {
  creatorName?: string;
}

interface TemplateFormProps {
  open: boolean;
  form: FormData;
  editId: number | null;
  onFormChange: (form: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function TemplateForm({
  open,
  form,
  editId,
  onFormChange,
  onSubmit,
  onCancel,
  loading = false,
}: TemplateFormProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : theme.spacing(2),
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 32px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: isMobile ? 1 : 2,
        }}
      >
        <Box>{editId ? '编辑邮件模板' : '新增邮件模板'}</Box>
        {isMobile && (
          <IconButton edge="end" color="inherit" onClick={onCancel} aria-label="close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          pb: isMobile ? 1 : 2,
          px: isMobile ? 2 : 3,
        }}
      >
        <form onSubmit={handleSubmit}>
          <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="模板名称"
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                helperText="邮件模板的唯一标识名称"
              />
              <TextField
                label="邮件标题"
                value={form.title}
                onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                helperText="邮件的主题行"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="语言代码"
                value={form.langCode}
                onChange={(e) => onFormChange({ ...form, langCode: e.target.value })}
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder="如: zh-CN, en-US"
                helperText="模板使用的语言代码（可选）"
              />
              <TextField
                label="模板分类"
                value={form.category}
                onChange={(e) => onFormChange({ ...form, category: e.target.value })}
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder="如: 通知, 营销, 系统"
                helperText="模板的分类标签（可选）"
              />
            </Stack>

            <TextField
              label="创建者名称"
              value={form.creatorName}
              onChange={(e) => onFormChange({ ...form, creatorName: e.target.value })}
              required
              fullWidth
              size={isMobile ? 'medium' : 'medium'}
              helperText="模板创建者的姓名"
            />

            <Box>
              <Typography variant="subtitle1" fontWeight={500} mb={1}>
                邮件内容
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                使用富文本编辑器编写邮件模板内容，支持HTML格式
              </Typography>
              <JoditEditor
                value={form.content}
                onChange={(html) => onFormChange({ ...form, content: html })}
                placeholder="请输入邮件模板内容..."
                height={isMobile ? 300 : 450}
              />
            </Box>
          </Stack>
        </form>
      </DialogContent>

      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? 1 : 0,
        }}
      >
        <Button
          onClick={onCancel}
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          disabled={loading}
        >
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          disabled={loading}
        >
          {loading ? '保存中...' : editId ? '更新' : '新增'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
