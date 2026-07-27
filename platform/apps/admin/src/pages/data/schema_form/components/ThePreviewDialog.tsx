import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Box,
  Typography,
  TextField,
  Alert,
} from '@mui/material';
import { DynamicForm } from '@/components/Form';
import { SchemaForm } from '@/components/Form/SchemaForm';
import { useFormError } from '@/hooks/useFormError';
import { useTranslation } from '@/hooks/useTranslation';
import * as SchemaFormDataAPI from '@/api/admin/data/schemaFormData';

export interface ThePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  formCode: string;
  schemaJson: string;
}

const ThePreviewDialog = memo(({ open, onClose, formCode, schemaJson }: ThePreviewDialogProps) => {
  const t = useTranslation();
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [businessId, setBusinessId] = useState<number>(1001);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 表单验证错误映射上下文
  const { fieldErrors, clearErrors, clearFieldError, rootSchema } = useFormError(
    schema || undefined,
  );

  const errorContextValue = useMemo(
    () => ({ fieldErrors, clearFieldError, rootSchema }),
    [fieldErrors, clearFieldError, rootSchema],
  );

  useEffect(() => {
    if (open) {
      setSubmitSuccess(false);
      setBusinessId(Math.floor(Math.random() * 9000) + 1000);
      clearErrors();
      try {
        const parsed = JSON.parse(schemaJson || '{}');
        setSchema(parsed);
        // 初始化默认数据结构
        const defaults: Record<string, unknown> = {};
        if (parsed.properties) {
          Object.keys(parsed.properties).forEach((k) => {
            const type = parsed.properties[k]?.type;
            if (type === 'boolean') {
              defaults[k] = false;
            } else {
              defaults[k] = '';
            }
          });
        }
        setFormData(defaults);
      } catch {
        setSchema(null);
      }
    }
  }, [open, schemaJson, clearErrors, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schema) return;

    setLoading(true);
    setSubmitSuccess(false);
    clearErrors();

    try {
      await SchemaFormDataAPI.submitFn({
        data: {
          formCode,
          businessId,
          data: formData,
        },
      });
      setSubmitSuccess(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('schemaForm.previewTitle')} - {formCode}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {submitSuccess && <Alert severity="success">{t('schemaForm.testSubmitSuccess')}</Alert>}

          <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('schemaForm.fields.testBusinessId')}
            </Typography>
            <TextField
              type="number"
              size="small"
              value={businessId}
              onChange={(e) => setBusinessId(Number(e.target.value))}
              fullWidth
              placeholder={t('schemaForm.fields.testBusinessIdPlaceholder')}
            />
          </Box>

          {schema ? (
            <SchemaForm contextValue={errorContextValue} onSubmit={handleSubmit}>
              <DynamicForm schema={schema} value={formData} onChange={setFormData} />
              <DialogActions sx={{ px: 0, pt: 3, pb: 0 }}>
                <Button onClick={onClose} variant="outlined">
                  {t('dialog.close')}
                </Button>
                <Button type="submit" variant="contained" color="primary" loading={loading}>
                  {t('schemaForm.submitTestData')}
                </Button>
              </DialogActions>
            </SchemaForm>
          ) : (
            <Typography color="error">{t('schemaForm.errors.noValidSchema')}</Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
});

ThePreviewDialog.displayName = 'ThePreviewDialog';

export default ThePreviewDialog;
