import { THIS_PERMISSION } from './constant';
import { useState } from 'react';
import { History as HistoryIcon } from '@mui/icons-material';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as CronAPI from '@/api/admin/maintenance/cron';
import type { CronObj, ListCronReq } from '@/api/admin/maintenance/type';

import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig } from './components/TheTable';
import CronFormFields from './components/TheForm';
import LogDialog from './components/LogDialog';

// 1. 定时任务主表单的 JSON Schema (前端轻量校验)
const cronFormSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    jobKey: { type: 'string', minLength: 1 },
    cronExpression: { type: 'string', minLength: 1 },
    status: { type: 'boolean' },
    parameters: { type: ['string', 'null'] },
  },
  required: ['name', 'jobKey', 'cronExpression', 'status'],
};

// 2. 默认表单初始状态
const DEFAULT_FORM: Partial<CronObj> = {
  name: '',
  jobKey: '',
  cronExpression: '*/5 * * * *',
  status: true,
  parameters: null,
};

export default function CronManagement() {
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CronObj | null>(null);

  const config: SchemaCrudConfig<CronObj, FilterState, ListCronReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: CronAPI.listFn,
      add: CronAPI.addFn,
      update: CronAPI.updateFn,
      delete: CronAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
          status: filters.status,
        }) as ListCronReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
      actions: () => [
        {
          key: 'logs',
          icon: <HistoryIcon />,
          color: 'info',
          permissionCodes: [THIS_PERMISSION.read],
          onClick: (row) => {
            setSelectedJob(row);
            setLogDialogOpen(true);
          },
        },
      ],
    },
    form: {
      schema: cronFormSchema,
      defaultForm: DEFAULT_FORM,
      afterOpen: (form, isEdit, row) => {
        if (isEdit && row) {
          return {
            ...form,
            name: row.name || '',
            jobKey: row.jobKey || '',
            cronExpression: row.cronExpression || '*/5 * * * *',
            status: row.status ?? true,
            parameters: row.parameters || null,
          };
        }
        return {
          ...form,
          name: '',
          jobKey: '',
          cronExpression: '*/5 * * * *',
          status: true,
          parameters: null,
        };
      },
      renderForm: (form, setForm, _errorContextValue, t) => (
        <CronFormFields
          form={form}
          setForm={setForm as unknown as Parameters<typeof CronFormFields>[0]['setForm']}
          t={t}
        />
      ),
    },
  };

  return (
    <>
      <SchemaCrudPage config={config} />
      <LogDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} job={selectedJob} />
    </>
  );
}
