import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Field, SchemaForm } from '@/components/Form';
import { showSnackbar } from '@/components/Notification';
import { useFormError } from '@/hooks/useFormError';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { useValidator } from '@/utils/validator';
import * as WebhookConfigAPI from '@/api/admin/base/webhook_config';
import type {
  AddWebhookConfigReq,
  UpdateWebhookConfigReq,
  WebhookConfigDetail,
} from '@/api/admin/base/webhook_config.type';

const formSchema = {
  type: 'object',
  properties: {
    source: { type: 'string', minLength: 1 },
    url: { type: 'string', minLength: 1, format: 'uri' },
    isEnabled: { type: 'boolean' },
    isPrimary: { type: 'boolean' },
    remark: { type: ['string', 'null'] },
  },
  required: ['source', 'url', 'isEnabled', 'isPrimary'],
  additionalProperties: false,
} as const;

interface Props {
  open: boolean;
  editId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

type FormState = Pick<WebhookConfigDetail, 'source' | 'url' | 'isEnabled' | 'isPrimary' | 'remark'>;

const defaultForm: FormState = {
  source: 'feishu',
  url: '',
  isEnabled: true,
  isPrimary: true,
  remark: '',
};

export function WebhookConfigFormDialog({ open, editId, onClose, onSuccess }: Props) {
  const t = useTranslation();
  const { isMobile } = useResponsive();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailReady, setDetailReady] = useState(false);
  const { validate } = useValidator(formSchema);
  const { fieldErrors, setFieldErrors, clearErrors, clearFieldError, handleFormError, rootSchema } =
    useFormError(formSchema);

  useEffect(() => {
    if (!open) return;
    clearErrors();
    setForm(defaultForm);
    if (editId === null) {
      setDetailReady(true);
      return;
    }
    setDetailReady(false);
    setDetailLoading(true);
    WebhookConfigAPI.detailFn({ data: { id: editId } })
      .then((response) => {
        const detail = response.data.data;
        setForm({
          source: detail.source,
          url: detail.url,
          isEnabled: detail.isEnabled,
          isPrimary: detail.isPrimary,
          remark: detail.remark,
        });
        setDetailReady(true);
      })
      .catch((error: unknown) => handleFormError(error))
      .finally(() => setDetailLoading(false));
  }, [clearErrors, editId, handleFormError, open]);

  const submit = async () => {
    clearErrors();
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setLoading(true);
    try {
      if (editId === null) {
        const data: AddWebhookConfigReq = { ...form };
        await WebhookConfigAPI.addFn({ data });
      } else {
        const data: UpdateWebhookConfigReq = { id: editId, ...form };
        await WebhookConfigAPI.updateFn({ data });
      }
      showSnackbar({ message: t('common.saveSuccess'), type: 'success' });
      onSuccess();
    } catch (error: unknown) {
      handleFormError(error);
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || detailLoading || !detailReady;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {editId === null
          ? t('admin.base.webhookConfig.create')
          : t('admin.base.webhookConfig.edit')}
        {isMobile && (
          <IconButton onClick={onClose} aria-label={t('dialog.close')}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        {detailLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <SchemaForm
            schema={formSchema}
            contextValue={{ fieldErrors, clearFieldError, rootSchema }}
          >
            <Stack spacing={2.5} sx={{ pt: 2 }}>
              <Field
                name="source"
                label={t('admin.base.webhookConfig.source')}
                value={form.source}
                onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
                placeholder="feishu"
                required
                fullWidth
                disabled={disabled}
              />
              <Field
                name="url"
                type="password"
                label={t('admin.base.webhookConfig.url')}
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                required
                fullWidth
                disabled={disabled}
              />
              <Field
                name="isEnabled"
                type="switch"
                label={t('common.isEnabled')}
                value={form.isEnabled}
                onChange={(value: boolean) => setForm((prev) => ({ ...prev, isEnabled: value }))}
                disabled={disabled}
              />
              <Field
                name="isPrimary"
                type="switch"
                label={t('admin.base.isPrimary')}
                value={form.isPrimary}
                onChange={(value: boolean) => setForm((prev) => ({ ...prev, isPrimary: value }))}
                disabled={disabled}
              />
              <Field
                name="remark"
                label={t('column.remark')}
                value={form.remark ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, remark: event.target.value }))}
                fullWidth
                disabled={disabled}
              />
            </Stack>
          </SchemaForm>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={disabled} color="inherit">
          {t('dialog.cancel')}
        </Button>
        <Button onClick={submit} disabled={disabled} variant="contained">
          {loading ? <CircularProgress size={22} /> : t('dialog.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
