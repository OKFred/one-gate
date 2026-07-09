import { FULL_PREFIX } from '../constant';
/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy } from 'react';
import { Stack, Box, Typography, CircularProgress } from '@mui/material';
import { TextField } from '@/components/Form';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { TemplateRes } from './TheTable';
import type { FilterState } from './TheFilter';
import type { AddMailTemplateReq, ListMailTemplateReq } from '@/api/infra/mail/type';
// 动态导入 JoditEditor 实现代码分割
const JoditEditor = lazy(() => import('@/components/JoditEditor/index'));

export interface TemplateFormFieldsProps {
  form: Partial<AddMailTemplateReq>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AddMailTemplateReq>>>;
  isMobile: boolean;
  t: (key: string) => string;
}

export const formConfig: SchemaCrudConfig<TemplateRes, FilterState, ListMailTemplateReq>['form'] = {
  schema: `${FULL_PREFIX}.add.req`,
  updateSchema: `${FULL_PREFIX}.update.req`,
  defaultForm: {
    name: '',
    title: '',
    langCode: '',
    content: '',
    category: '',
    isEnabled: true,
    remark: null,
  },
  beforeSubmit: (form, isEdit) => {
    return {
      ...form,
      langCode: form.langCode || (isEdit ? undefined : ''),
      category: form.category || '',
      remark: form.remark ?? null,
    };
  },
  renderForm: (form, setForm, isMobile, t) => (
    <TemplateFormFields
      form={form as Partial<AddMailTemplateReq>}
      setForm={setForm as React.Dispatch<React.SetStateAction<Partial<AddMailTemplateReq>>>}
      isMobile={isMobile}
      t={t}
    />
  ),
};

function TemplateFormFields({ form, setForm, isMobile, t }: TemplateFormFieldsProps) {
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
          name="name"
          label={t('template.table.name')}
          value={form.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          required
          fullWidth
          size="medium"
          helperText={t('template.table.nameHelp')}
        />
        <TextField
          name="title"
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
          name="langCode"
          label={t('translation.table.langCode')}
          value={form.langCode || ''}
          onChange={(e) => handleFieldChange('langCode', e.target.value)}
          fullWidth
          size="medium"
          placeholder={t('form.pleaseEnter')}
          helperText={t('template.table.langCodeHelp')}
        />
        <TextField
          name="category"
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
        name="remark"
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
