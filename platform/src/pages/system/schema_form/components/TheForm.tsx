import React, { useState } from 'react';
import { Stack, Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Field } from '@/components/Form';
import hasValue from '@/utils/hasValue';

import type { SchemaFormItem } from './TheTable';

export interface SchemaFormFieldsProps {
  form: Partial<SchemaFormItem>;
  setForm: React.Dispatch<React.SetStateAction<Partial<SchemaFormItem>>>;
  t: (key: string) => string;
}

const SCHEMAS_TEMPLATES = [
  {
    name: '用户意见反馈表',
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

export default function SchemaFormFields({ form, setForm, t }: SchemaFormFieldsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates = [
    {
      ...SCHEMAS_TEMPLATES[0],
      tLabel: t('schemaForm.templates.feedback'),
    },
    {
      ...SCHEMAS_TEMPLATES[1],
      tLabel: t('schemaForm.templates.rsvp'),
    },
  ];

  const handleApplyTemplate = (templateIndex: string) => {
    if (templateIndex === '') return;
    const idx = Number(templateIndex);
    const tpl = templates[idx];
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

  const isEdit = !!form.id;

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      {!isEdit && (
        <FormControl size="small" fullWidth>
          <InputLabel id="template-select-label">{t('schemaForm.quickTemplate')}</InputLabel>
          <Select
            labelId="template-select-label"
            value={selectedTemplate}
            label={t('schemaForm.quickTemplate')}
            onChange={(e) => handleApplyTemplate(e.target.value)}
          >
            <MenuItem value="">{t('schemaForm.selectTemplate')}</MenuItem>
            {templates.map((tpl, i) => (
              <MenuItem key={i} value={String(i)}>
                {tpl.tLabel}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Field
          name="code"
          label={t('schemaForm.fields.code')}
          placeholder={t('schemaForm.fields.codePlaceholder')}
          value={form.code ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
          disabled={isEdit}
          required
          fullWidth
        />
        <Field
          name="name"
          label={t('schemaForm.fields.name')}
          placeholder={t('schemaForm.fields.namePlaceholder')}
          value={form.name ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
          fullWidth
        />
      </Stack>

      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
          {t('schemaForm.fields.schemaData')}
        </Typography>
        <Field
          name="schemaData"
          label=""
          placeholder='{"type": "object", "properties": { ... }}'
          value={form.schemaData ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, schemaData: e.target.value }))}
          required
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

      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
          {t('schemaForm.fields.uiSchemaData')}
        </Typography>
        <Field
          name="uiSchemaData"
          label=""
          placeholder='{"ui:order": ["field1", "field2"]}'
          value={form.uiSchemaData ?? ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              uiSchemaData: hasValue(e.target.value) ? e.target.value : null,
            }))
          }
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

      <Field
        name="remark"
        label={t('column.remark')}
        placeholder={t('schemaForm.fields.remarkPlaceholder')}
        value={form.remark ?? ''}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            remark: hasValue(e.target.value) ? e.target.value : null,
          }))
        }
        fullWidth
        multiline
        rows={2}
      />

      <Field
        name="isEnabled"
        label={t('status.enabled')}
        type="switch"
        value={!!form.isEnabled}
        onChange={(checked: boolean) => setForm((prev) => ({ ...prev, isEnabled: checked }))}
      />
    </Stack>
  );
}
