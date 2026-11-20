import { useState, type Dispatch, type SetStateAction } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { adminDataSchemaFormContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { Field } from '@/components/Form';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import hasValue from '@/utils/hasValue';
import type { ListSchemaFormRes } from '@/api/admin/data/type';
import ThePreviewDialog from './components/ThePreviewDialog';

type SchemaFormRecord = NonNullable<ListSchemaFormRes['list']>[number] & Record<string, unknown>;

const PRESET_TEMPLATES = [
  {
    name: '用户意见反馈表',
    code: 'user_feedback',
    labelKey: 'schemaForm.templates.feedback',
    schema: {
      type: 'object',
      properties: {
        feedbackType: {
          type: 'string',
          title: '反馈类型',
          enum: ['Bug 反馈', '功能建议', '其他意见'],
        },
        title: { type: 'string', title: '问题标题', maxLength: 50 },
        description: { type: 'string', title: '详细描述', maxLength: 200 },
        satisfaction: {
          type: 'number',
          title: '满意度评分 (1-5)',
          minimum: 1,
          maximum: 5,
        },
        contactEmail: { type: 'string', title: '联系邮箱' },
        subscribe: { type: 'boolean', title: '是否订阅 product 动态' },
      },
      required: ['feedbackType', 'title', 'description', 'contactEmail'],
      additionalProperties: false,
    },
  },
  {
    name: '活动报名登记表',
    code: 'activity_rsvp',
    labelKey: 'schemaForm.templates.rsvp',
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', title: '姓名' },
        age: { type: 'number', title: '年龄', minimum: 1 },
        dietary: {
          type: 'string',
          title: '饮食偏好',
          enum: ['无特殊要求', '素食', '清真', '其他'],
        },
        needAccommodation: { type: 'boolean', title: '是否需要住宿' },
      },
      required: ['fullName', 'age', 'dietary'],
      additionalProperties: false,
    },
  },
] as const;

interface QuickTemplateSelectorProps {
  t: (key: string) => string;
  setForm: Dispatch<SetStateAction<Partial<SchemaFormRecord>>>;
}

function QuickTemplateSelector({ t, setForm }: QuickTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const handleApplyTemplate = (templateIndex: string) => {
    setSelectedTemplate(templateIndex);
    if (templateIndex === '') return;
    const tpl = PRESET_TEMPLATES[Number(templateIndex)];
    if (tpl) {
      setForm((prev) => ({
        ...prev,
        code: tpl.code,
        name: tpl.name,
        schemaData: JSON.stringify(tpl.schema, null, 2),
      }));
    }
  };

  return (
    <FormControl size="small" fullWidth>
      <InputLabel id="schema-form-template-label">{t('schemaForm.quickTemplate')}</InputLabel>
      <Select
        labelId="schema-form-template-label"
        value={selectedTemplate}
        label={t('schemaForm.quickTemplate')}
        onChange={(e) => handleApplyTemplate(String(e.target.value))}
      >
        <MenuItem value="">{t('schemaForm.selectTemplate')}</MenuItem>
        {PRESET_TEMPLATES.map((tpl, idx) => (
          <MenuItem key={tpl.code} value={String(idx)}>
            {t(tpl.labelKey)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default function SchemaFormManagement() {
  const t = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<SchemaFormRecord | null>(null);

  const extensions: CrudExtensions<SchemaFormRecord> = {
    rowActions: () => [
      {
        key: 'preview',
        icon: <VisibilityIcon />,
        color: 'info',
        onClick: (row) => {
          setPreviewRow(row);
          setPreviewOpen(true);
        },
      },
    ],
    formHeader: (ctx) =>
      ctx.isEdit ? null : <QuickTemplateSelector t={ctx.t} setForm={ctx.setForm} />,
    customFormFields: {
      schemaData: (ctx) => (
        <Box>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            {ctx.t('schemaForm.fields.schemaData')}
          </Typography>
          <Field
            name="schemaData"
            label=""
            placeholder='{"type": "object", "properties": { ... }}'
            value={ctx.form.schemaData ?? ''}
            onChange={(e) => ctx.setForm((prev) => ({ ...prev, schemaData: e.target.value }))}
            required
            disabled={ctx.disabled}
            fullWidth
            multiline
            rows={10}
            slotProps={{
              htmlInput: {
                style: { fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.875rem' },
              },
            }}
          />
        </Box>
      ),
      uiSchemaData: (ctx) => (
        <Box>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            {ctx.t('schemaForm.fields.uiSchemaData')}
          </Typography>
          <Field
            name="uiSchemaData"
            label=""
            placeholder='{"ui:order": ["field1", "field2"]}'
            value={ctx.form.uiSchemaData ?? ''}
            onChange={(e) =>
              ctx.setForm((prev) => ({
                ...prev,
                uiSchemaData: hasValue(e.target.value) ? e.target.value : null,
              }))
            }
            disabled={ctx.disabled}
            fullWidth
            multiline
            rows={4}
            slotProps={{
              htmlInput: {
                style: { fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.875rem' },
              },
            }}
          />
        </Box>
      ),
    },
    beforeSubmitAsync: (form) => {
      if (form.schemaData) {
        try {
          JSON.parse(form.schemaData);
        } catch {
          const msg = t('schemaForm.errors.invalidJson');
          showSnackbar({ message: msg, type: 'error' });
          throw new Error(msg);
        }
      }
      if (form.uiSchemaData) {
        try {
          JSON.parse(form.uiSchemaData);
        } catch {
          const msg = t('schemaForm.errors.invalidUiObject');
          showSnackbar({ message: msg, type: 'error' });
          throw new Error(msg);
        }
      }
      return form;
    },
    dialogs: () => (
      <ThePreviewDialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewRow(null);
        }}
        formCode={previewRow?.code || ''}
        schemaJson={previewRow?.schemaData || ''}
      />
    ),
  };

  return <ContractCrudPage contract={adminDataSchemaFormContract} extensions={extensions} />;
}
