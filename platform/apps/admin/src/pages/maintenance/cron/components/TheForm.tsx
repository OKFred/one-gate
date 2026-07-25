import React, { useState, useEffect } from 'react';
import { Box, Stack } from '@mui/material';
import { Field } from '@/components/Form';
import CronHelper from './CronHelper';
import hasValue from '@/utils/hasValue';
import type { CronObj, ApiTaskObj } from '@/api/admin/maintenance/type';
import * as ApiTaskAPI from '@/api/admin/maintenance/api-task';

export interface CronFormFieldsProps {
  form: Partial<CronObj>;
  setForm: React.Dispatch<React.SetStateAction<Partial<CronObj>>>;
  t: (key: string) => string;
}

export default function CronFormFields({ form, setForm, t }: CronFormFieldsProps) {
  const [dynamicOptions, setDynamicOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    ApiTaskAPI.listFn({
      data: {
        pageNo: 1,
        pageSize: 1000,
      },
    })
      .then((res) => {
        const list = res?.data?.data?.list || [];
        const opts = list.map((item: ApiTaskObj) => ({
          label: `${item.name} (${item.taskKey})${!item.isEnabled ? ` - [${t('status.disabled')}]` : ''}`,
          value: item.taskKey,
        }));
        setDynamicOptions(opts);
      })
      .catch((err) => {
        console.error('Failed to load API tasks for cron job form:', err);
      });
  }, [t]);

  return (
    <Box sx={{ pt: 2 }}>
      <Stack spacing={3}>
        <Field
          name="name"
          label={t('cron.field.name')}
          value={form.name || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
          fullWidth
          size="medium"
          placeholder={t('form.pleaseEnter')}
        />

        <Field
          name="jobKey"
          label={t('cron.field.jobKey')}
          type="select"
          value={form.jobKey || ''}
          onChange={(val: unknown) => setForm((prev) => ({ ...prev, jobKey: val as string }))}
          options={dynamicOptions}
          required
          fullWidth
        />

        <Field
          name="cronExpression"
          label={t('cron.field.cronExpression')}
          value={form.cronExpression || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, cronExpression: e.target.value }))}
          required
          fullWidth
          size="medium"
          placeholder={t('cron.field.cronExpressionPlaceholder')}
        />

        <CronHelper value={form.cronExpression || ''} />

        <Field
          name="status"
          label={t('cron.field.statusLabel')}
          type="switch"
          value={!!form.status}
          onChange={(checked: boolean) => setForm((prev) => ({ ...prev, status: checked }))}
        />

        <Field
          name="parameters"
          label={t('cron.field.parameters')}
          value={form.parameters || ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              parameters: hasValue(e.target.value) ? e.target.value : null,
            }))
          }
          fullWidth
          multiline
          rows={3}
          size="medium"
          placeholder={t('form.pleaseEnter')}
        />
      </Stack>
    </Box>
  );
}
