import React from 'react';
import { Box, Stack, Divider } from '@mui/material';
import { Field } from '@/components/Form';
import type { ApiTaskObj } from '@/api/admin/maintenance/type';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const monoStyle = {
  '& .MuiInputBase-root': {
    fontFamily: '"Fira Code", "Courier New", Courier, monospace',
    fontSize: '13px',
    backgroundColor: '#1a1a2e',
    color: '#e2e8f0',
    padding: '8px',
    borderRadius: '4px',
    lineHeight: '1.5',
  },
};

interface TheFormProps {
  form: Partial<ApiTaskObj>;
  setForm: React.Dispatch<React.SetStateAction<Partial<ApiTaskObj>>>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const TheForm: React.FC<TheFormProps> = ({ form, setForm, t }) => {
  return (
    <Box sx={{ pt: 2 }}>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <Field
            name="name"
            label={t('apiTask.field.name')}
            value={form.name || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            fullWidth
            placeholder={t('form.pleaseEnter')}
          />
          <Field
            name="taskKey"
            label={t('apiTask.field.taskKey')}
            value={form.taskKey || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, taskKey: e.target.value }))}
            required
            fullWidth
            disabled={form.id !== undefined}
            placeholder="e.g. collect_weather"
          />
        </Stack>

        <Field
          name="description"
          label={t('apiTask.field.description')}
          value={form.description || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          fullWidth
          multiline
          rows={2}
          placeholder={t('form.pleaseEnter')}
        />

        <Divider />

        <Stack direction="row" spacing={2}>
          <Field
            name="method"
            label={t('apiTask.field.method')}
            type="select"
            value={form.method || 'GET'}
            onChange={(val: unknown) =>
              setForm((prev) => ({ ...prev, method: val as ApiTaskObj['method'] }))
            }
            options={HTTP_METHODS.map((m) => ({ label: m, value: m }))}
            required
            sx={{ minWidth: 130 }}
          />
          <Field
            name="baseUrl"
            label={t('apiTask.field.baseUrl')}
            value={form.baseUrl || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
            required
            fullWidth
            placeholder="https://api.example.com"
          />
          <Field
            name="path"
            label={t('apiTask.field.path')}
            value={form.path || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, path: e.target.value }))}
            required
            fullWidth
            placeholder="/v1/data"
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Field
            name="timeoutMs"
            label={t('apiTask.field.timeoutMs')}
            type="number"
            value={form.timeoutMs ?? 5000}
            onChange={(e) => setForm((prev) => ({ ...prev, timeoutMs: Number(e.target.value) }))}
            required
            sx={{ minWidth: 160 }}
          />
          <Field
            name="isEnabled"
            label={t('apiTask.field.status')}
            type="switch"
            value={!!form.isEnabled}
            onChange={(checked: boolean) => setForm((prev) => ({ ...prev, isEnabled: checked }))}
          />
        </Stack>

        <Field
          name="headers"
          label={t('apiTask.field.headers')}
          value={form.headers || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, headers: e.target.value }))}
          fullWidth
          multiline
          rows={3}
          sx={monoStyle}
          placeholder={'{\n  "Authorization": "Bearer YOUR_TOKEN"\n}'}
        />

        <Field
          name="requestSchema"
          label={t('apiTask.field.requestSchema')}
          value={form.requestSchema || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, requestSchema: e.target.value }))}
          fullWidth
          multiline
          rows={5}
          sx={monoStyle}
          placeholder={
            '{\n  "type": "object",\n  "properties": {\n    "q": { "type": "string" }\n  }\n}'
          }
        />

        <Field
          name="responseSchema"
          label={t('apiTask.field.responseSchema')}
          value={form.responseSchema || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, responseSchema: e.target.value }))}
          fullWidth
          multiline
          rows={4}
          sx={monoStyle}
          placeholder={'{\n  "type": "object"\n}'}
        />
      </Stack>
    </Box>
  );
};
