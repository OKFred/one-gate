import React, { Suspense, lazy } from 'react';
import { TextField, Stack, Box, Typography, CircularProgress } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';
import type { AddMailTemplateReq } from '@/api/mail/type';

// 动态导入 JoditEditor 实现代码分割
const JoditEditor = lazy(() => import('@/components/JoditEditor/index'));

export interface TemplateFormFieldsProps {
  form: Partial<AddMailTemplateReq>;
  setForm: Dispatch<SetStateAction<Partial<AddMailTemplateReq>>>;
  isMobile: boolean;
  t: (key: string) => string;
}

/**
 * 邮件模板高内聚表单字段组件（包含异步 Jodit 富文本编辑器）
 */
export default function TemplateFormFields({
  form,
  setForm,
  isMobile,
  t,
}: TemplateFormFieldsProps) {
  const handleFieldChange = (key: keyof AddMailTemplateReq, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('template.table.name')}
          value={form.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          required
          fullWidth
          size="medium"
          helperText={t('template.table.nameHelp')}
        />
        <TextField
          label={t('template.table.subject')}
          value={form.title || ''}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          required
          fullWidth
          size="medium"
          helperText={t('template.table.subjectHelp')}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('translation.table.langCode')}
          value={form.langCode || ''}
          onChange={(e) => handleFieldChange('langCode', e.target.value)}
          fullWidth
          size="medium"
          placeholder={t('form.pleaseEnter')}
          helperText={t('template.table.langCodeHelp')}
        />
        <TextField
          label={t('template.table.category')}
          value={form.category || ''}
          onChange={(e) => handleFieldChange('category', e.target.value)}
          fullWidth
          size="medium"
          placeholder={t('form.pleaseEnter')}
          helperText={t('template.table.categoryHelp')}
        />
      </Stack>

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
          {t('template.table.contentLabel')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('template.table.contentHelp')}
        </Typography>
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          }
        >
          <JoditEditor
            value={form.content || ''}
            onChange={(html) => handleFieldChange('content', html)}
            placeholder={t('form.pleaseEnter')}
            height={isMobile ? 300 : 450}
          />
        </Suspense>
      </Box>

      <TextField
        label={t('column.remark')}
        value={form.remark || ''}
        onChange={(e) => handleFieldChange('remark', e.target.value || null)}
        fullWidth
        multiline
        rows={2}
        size="medium"
        slotProps={{ htmlInput: { maxLength: 500 } }}
        helperText={`${(form.remark || '').length}/500`}
        placeholder={t('form.pleaseEnter')}
      />
    </Stack>
  );
}
