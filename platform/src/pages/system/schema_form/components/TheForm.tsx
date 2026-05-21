import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  memo,
  useCallback,
  useMemo,
} from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Box,
  useTheme,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as SchemaFormAPI from '@/api/system/schemaForm';
import type { Props } from '../index';
import type { ListSchemaFormRes } from '@/api/system/type';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormError } from '@/hooks/useFormError';
import { SchemaForm, Field } from '@/components/Form';
import { useValidator } from '@/utils/validator';

export type SchemaFormItem = NonNullable<ListSchemaFormRes['list']>[0];

// 暴露给父组件的方法
export interface TheFormRef {
  openAdd: () => void;
  openEdit: (row: SchemaFormItem) => void;
  close: () => void;
}

// 客户端静态 Schema 校验
const formSchema = {
  type: 'object',
  properties: {
    code: {
      type: 'string',
      maxLength: 100,
      pattern: '^[a-zA-Z0-9_-]+$',
    },
    name: {
      type: 'string',
      maxLength: 100,
    },
    schemaData: {
      type: 'string',
    },
    uiSchemaData: {
      type: ['string', 'null'],
      nullable: true,
    },
    remark: {
      type: ['string', 'null'],
      nullable: true,
      maxLength: 500,
    },
    isEnabled: {
      type: 'boolean',
    },
  },
  required: ['code', 'name', 'schemaData', 'isEnabled'],
  additionalProperties: false,
} as const;

const DEFAULT_FORM = {
  code: '',
  name: '',
  schemaData: '',
  uiSchemaData: '',
  remark: '',
  isEnabled: true,
};

// 预设 JSON Schema 模板
const SCHEMAS_TEMPLATES = [
  {
    name: '用户意见反馈表',
    tKey: 'schemaForm.templates.feedback',
    code: 'user_feedback',
    schema: {
      type: 'object',
      properties: {
        feedbackType: {
          type: 'string',
          title: '反馈类型',
          enum: ['Bug 反馈', '功能建议', '其他意见'],
        },
        title: {
          type: 'string',
          title: '问题标题',
          maxLength: 50,
        },
        description: {
          type: 'string',
          title: '详细描述',
          maxLength: 200,
        },
        satisfaction: {
          type: 'number',
          title: '满意度评分 (1-5)',
          minimum: 1,
          maximum: 5,
        },
        contactEmail: {
          type: 'string',
          title: '联系邮箱',
        },
        subscribe: {
          type: 'boolean',
          title: '是否订阅 product 动态',
        },
      },
      required: ['feedbackType', 'title', 'description', 'contactEmail'],
      additionalProperties: false,
    },
  },
  {
    name: '活动报名登记表',
    tKey: 'schemaForm.templates.rsvp',
    code: 'activity_rsvp',
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          title: '姓名',
        },
        age: {
          type: 'number',
          title: '年龄',
          minimum: 1,
        },
        dietary: {
          type: 'string',
          title: '饮食偏好',
          enum: ['无特殊要求', '素食', '清真', '其他'],
        },
        needAccommodation: {
          type: 'boolean',
          title: '是否需要住宿',
        },
      },
      required: ['fullName', 'age', 'dietary'],
      additionalProperties: false,
    },
  },
];

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('');

    const {
      fieldErrors,
      handleFormError,
      clearErrors,
      clearFieldError,
      setFieldErrors,
      rootSchema,
    } = useFormError(formSchema as Record<string, unknown>);
    const { validate } = useValidator(formSchema);

    const errorContextValue = useMemo(
      () => ({ fieldErrors, clearFieldError, rootSchema }),
      [fieldErrors, clearFieldError, rootSchema],
    );

    const handleCancel = useCallback(() => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
      setSelectedTemplate('');
      clearErrors();
    }, [clearErrors]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        openAdd: () => {
          setEditId(null);
          setForm(DEFAULT_FORM);
          setSelectedTemplate('');
          setOpen(true);
        },
        openEdit: (row: SchemaFormItem) => {
          setEditId(row.id || null);
          setForm({
            code: row.code || '',
            name: row.name || '',
            schemaData: row.schemaData || '',
            uiSchemaData: row.uiSchemaData || '',
            remark: row.remark || '',
            isEnabled: row.isEnabled ?? true,
          });
          setSelectedTemplate('');
          setOpen(true);
        },
        close: () => {
          handleCancel();
        },
      }),
      [handleCancel],
    );

    // 套用模板
    const handleApplyTemplate = (templateIndex: string) => {
      if (templateIndex === '') return;
      const idx = Number(templateIndex);
      const tpl = SCHEMAS_TEMPLATES[idx];
      if (tpl) {
        setForm((prev) => ({
          ...prev,
          code: tpl.code,
          name: tpl.name,
          schemaData: JSON.stringify(tpl.schema, null, 2),
        }));
        setSelectedTemplate(templateIndex);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // 1. 前端预校验字段
      const clientErrors = validate(form);

      // 2. 校验 JSON Schema 格式
      if (form.schemaData) {
        try {
          const parsed = JSON.parse(form.schemaData);
          if (typeof parsed !== 'object' || parsed === null) {
            clientErrors.schemaData = t('schemaForm.errors.invalidObject');
          }
        } catch {
          clientErrors.schemaData = t('schemaForm.errors.invalidJson');
        }
      }

      if (form.uiSchemaData) {
        try {
          const parsed = JSON.parse(form.uiSchemaData);
          if (typeof parsed !== 'object' || parsed === null) {
            clientErrors.uiSchemaData = t('schemaForm.errors.invalidUiObject');
          }
        } catch {
          clientErrors.uiSchemaData = t('schemaForm.errors.invalidJson');
        }
      }

      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        return;
      }

      setLoading(true);

      try {
        if (editId) {
          await SchemaFormAPI.updateFn({ data: { id: editId, ...form } });
        } else {
          await SchemaFormAPI.addFn({ data: form });
        }
        handleCancel();
        tableRef.current?.refresh();
      } catch (error: unknown) {
        handleFormError(error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog
        open={open}
        onClose={handleCancel}
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
            {editId ? t('schemaForm.editTitle') : t('schemaForm.addTitle')}
          </Box>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleCancel} aria-label="close">
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
          <SchemaForm contextValue={errorContextValue} onSubmit={handleSubmit}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {!editId && (
                <FormControl size="small" fullWidth>
                  <InputLabel id="template-select-label">
                    {t('schemaForm.quickTemplate')}
                  </InputLabel>
                  <Select
                    labelId="template-select-label"
                    value={selectedTemplate}
                    label={t('schemaForm.quickTemplate')}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                  >
                    <MenuItem value="">{t('schemaForm.selectTemplate')}</MenuItem>
                    {SCHEMAS_TEMPLATES.map((tpl, i) => (
                      <MenuItem key={i} value={String(i)}>
                        {t(tpl.tKey)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Field
                  name="code"
                  type="text"
                  label={t('schemaForm.fields.code')}
                  placeholder={t('schemaForm.fields.codePlaceholder')}
                  value={form.code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setForm({ ...form, code: e.target.value })
                  }
                  disabled={!!editId}
                  required
                />
                <Field
                  name="name"
                  type="text"
                  label={t('schemaForm.fields.name')}
                  placeholder={t('schemaForm.fields.namePlaceholder')}
                  value={form.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </Stack>

              <Box>
                <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('schemaForm.fields.schemaData')}
                </Typography>
                <Field
                  name="schemaData"
                  type="text"
                  label=""
                  placeholder='{"type": "object", "properties": { ... }}'
                  value={form.schemaData}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setForm({ ...form, schemaData: e.target.value })
                  }
                  required
                  slotProps={{
                    input: {
                      multiline: true,
                      rows: 10,
                      style: { fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.875rem' },
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('schemaForm.fields.uiSchemaData')}
                </Typography>
                <Field
                  name="uiSchemaData"
                  type="text"
                  label=""
                  placeholder='{"ui:order": ["field1", "field2"]}'
                  value={form.uiSchemaData || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setForm({ ...form, uiSchemaData: e.target.value })
                  }
                  slotProps={{
                    input: {
                      multiline: true,
                      rows: 4,
                      style: { fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.875rem' },
                    },
                  }}
                />
              </Box>

              <Field
                name="remark"
                type="text"
                label={t('column.remark')}
                placeholder={t('schemaForm.fields.remarkPlaceholder')}
                value={form.remark || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setForm({ ...form, remark: e.target.value })
                }
                slotProps={{
                  input: {
                    multiline: true,
                    rows: 2,
                  },
                }}
              />

              <Field
                name="isEnabled"
                type="switch"
                label={t('status.enabled')}
                value={form.isEnabled}
                onChange={(checked: boolean) => setForm({ ...form, isEnabled: checked })}
              />
            </Stack>

            <DialogActions
              sx={{
                px: 0,
                pt: 3,
                pb: 0,
              }}
            >
              <Button onClick={handleCancel} variant="outlined" disabled={loading}>
                {t('dialog.cancel')}
              </Button>
              <Button type="submit" variant="contained" color="primary" loading={loading}>
                {t('dialog.save')}
              </Button>
            </DialogActions>
          </SchemaForm>
        </DialogContent>
      </Dialog>
    );
  }),
);

export default TheForm;
