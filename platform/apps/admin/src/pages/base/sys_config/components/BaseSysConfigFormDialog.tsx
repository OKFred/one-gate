import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  CircularProgress,
  Stack,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { Field } from '@/components/Form/Field';
import { DynamicForm } from '@/components/Form/DynamicForm';
import * as BaseSysConfigAPI from '@/api/admin/base/sys_config';
import type { ConfigRes, NamespacesRes, SchemaRes } from '@/api/admin/base/type';
import { SchemaForm } from '@/components/Form';
import { useValidator } from '@/utils/validator';
import { useFormError } from '@/hooks/useFormError';

interface BaseSysConfigFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRow: ConfigRes | null;
}

const baseSchema = {
  type: 'object',
  properties: {
    namespace: { type: 'string' },
    configKey: { type: 'string' },
    isEnabled: { type: 'boolean' },
    isPrimary: { type: 'boolean' },
    remark: { type: ['string', 'null'] },
  },
  required: ['namespace', 'configKey'],
};

export function BaseSysConfigFormDialog({
  open,
  onClose,
  onSuccess,
  editRow,
}: BaseSysConfigFormDialogProps) {
  const { isMobile } = useResponsive();
  const t = useTranslation();
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [namespaces, setNamespaces] = useState<NamespacesRes[]>([]);
  const [form, setForm] = useState<Partial<ConfigRes>>({
    isEnabled: true,
    isPrimary: false,
    configValue: {},
  });
  const [dynamicSchema, setDynamicSchema] = useState<SchemaRes | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // Validation hook
  const { validate } = useValidator(baseSchema);
  const { fieldErrors, handleFormError, clearErrors, clearFieldError, rootSchema } =
    useFormError(baseSchema);
  const errorContextValue = { fieldErrors, clearFieldError, rootSchema };

  useEffect(() => {
    if (open) {
      clearErrors();
      fetchNamespaces();
      if (editRow) {
        setForm(editRow);
        if (editRow.namespace) {
          fetchSchema(editRow.namespace);
        }
      } else {
        setForm({
          isEnabled: true,
          isPrimary: false,
          configValue: {},
        });
        setDynamicSchema(null);
      }
    }
  }, [open, editRow]);

  const fetchNamespaces = async () => {
    try {
      const res = await BaseSysConfigAPI.namespacesFn({ data: {} });
      if (res.data) {
        setNamespaces(res.data.data);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchSchema = async (namespace: string) => {
    setSchemaLoading(true);
    try {
      const res = await BaseSysConfigAPI.schemaFn({ data: { namespace } });
      if (res.data) {
        setDynamicSchema(res.data.data);
        if (!editRow) {
          // set default values
          setForm((prev: Partial<ConfigRes>) => ({
            ...prev,
            configValue: res.data.data.defaultValues || {},
          }));
        }
      }
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleNamespaceChange = (ns: unknown) => {
    const namespace = ns as string;
    setForm((prev: Partial<ConfigRes>) => ({ ...prev, namespace, configValue: {} }));
    if (namespace) {
      fetchSchema(namespace);
    } else {
      setDynamicSchema(null);
    }
  };

  const handleSave = async () => {
    clearErrors();
    const errors = validate(form);
    const isValid = Object.keys(errors).length === 0;
    if (!isValid) {
      handleFormError(errors);
      return;
    }

    setLoading(true);
    try {
      if (editRow) {
        await BaseSysConfigAPI.updateFn({
          data: {
            id: editRow.id,
            configKey: form.configKey!,
            isEnabled: !!form.isEnabled,
            isPrimary: !!form.isPrimary,
            remark: form.remark,
            configValue: form.configValue || {},
          },
        });
      } else {
        await BaseSysConfigAPI.addFn({
          data: {
            namespace: form.namespace!,
            configKey: form.configKey!,
            isEnabled: !!form.isEnabled,
            isPrimary: !!form.isPrimary,
            remark: form.remark,
            configValue: form.configValue || {},
          },
        });
      }
      onSuccess();
    } catch (e: unknown) {
      handleFormError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : theme.spacing(4),
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editRow ? t('dialog.edit') : t('dialog.add')}
        </Box>
        {isMobile && (
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ pb: isMobile ? 1 : 2, px: isMobile ? 2 : 3 }}>
        <SchemaForm schema={baseSchema} contextValue={errorContextValue}>
          <Box sx={{ pt: 2 }}>
            <Stack spacing={3}>
              <Field
                name="namespace"
                type="select"
                label={t('admin.base.namespace')}
                value={form.namespace || ''}
                onChange={handleNamespaceChange}
                disabled={!!editRow}
                schema={{ enum: namespaces.map((n: NamespacesRes) => n.namespace) }}
                options={namespaces.map((n: NamespacesRes) => ({
                  label: n.namespace,
                  value: n.namespace,
                }))}
                required
                fullWidth
              />
              <Field
                name="configKey"
                type="text"
                label={t('admin.base.configKey')}
                value={form.configKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, configKey: e.target.value })
                }
                disabled={loading}
                required
                fullWidth
              />
              <Field
                name="isEnabled"
                type="switch"
                label={t('common.isEnabled')}
                value={form.isEnabled ?? false}
                onChange={(val: boolean) => setForm({ ...form, isEnabled: val })}
                disabled={loading}
              />
              <Field
                name="isPrimary"
                type="switch"
                label={t('admin.base.isPrimary')}
                value={form.isPrimary ?? false}
                onChange={(val: boolean) => setForm({ ...form, isPrimary: val })}
                disabled={loading}
              />
              <Field
                name="remark"
                type="text"
                label={t('column.remark')}
                value={form.remark}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, remark: e.target.value })
                }
                disabled={loading}
                fullWidth
              />

              {schemaLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {dynamicSchema && !schemaLoading && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ mb: 2, fontWeight: 'bold' }}>{t('admin.base.configValue')}</Box>
                  <DynamicForm
                    schema={dynamicSchema.schema}
                    value={(form.configValue as Record<string, unknown>) || {}}
                    onChange={(val: Record<string, unknown>) =>
                      setForm({ ...form, configValue: val })
                    }
                    disabled={loading}
                  />
                </Box>
              )}
            </Stack>
          </Box>
        </SchemaForm>
      </DialogContent>

      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? 1 : 0,
        }}
      >
        <Button onClick={onClose} disabled={loading} fullWidth={isMobile} color="inherit">
          {t('dialog.cancel')}
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading} fullWidth={isMobile}>
          {loading ? <CircularProgress size={24} /> : t('dialog.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
