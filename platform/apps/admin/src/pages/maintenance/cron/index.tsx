import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Chip, Stack } from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { adminMaintenanceCronContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { Field } from '@/components/Form';
import { useFormErrorContext } from '@/hooks/useFormError';
import { permissions } from '@/hooks/usePermission';
import * as ApiTaskAPI from '@/api/admin/maintenance/api-task';
import type { ApiTaskObj, CronObj } from '@/api/admin/maintenance/type';
import CronHelper from './components/CronHelper';
import LogDialog from './components/LogDialog';

type CronRecord = CronObj & Record<string, unknown>;

interface CronJobKeyFieldProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  disabled: boolean;
  setForm: Dispatch<SetStateAction<Partial<CronRecord>>>;
}

function CronJobKeyField({ label, value, options, disabled, setForm }: CronJobKeyFieldProps) {
  const errorContext = useFormErrorContext();

  return (
    <Field
      name="jobKey"
      label={label}
      type="select"
      value={value}
      disabled={disabled}
      onChange={(val: unknown) => {
        errorContext?.clearFieldError('jobKey');
        setForm((prev) => ({ ...prev, jobKey: String(val) }));
      }}
      options={options}
      required
      fullWidth
    />
  );
}

export default function CronManagement() {
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CronRecord | null>(null);
  const [apiTasks, setApiTasks] = useState<ApiTaskObj[]>([]);

  useEffect(() => {
    let active = true;
    ApiTaskAPI.listFn({ data: { pageNo: 1, pageSize: 1000 } })
      .then((res) => {
        if (!active) return;
        setApiTasks(res?.data?.data?.list ?? []);
      })
      .catch(() => {
        // 全局拦截器处理错误
      });
    return () => {
      active = false;
    };
  }, []);

  const extensions: CrudExtensions<CronRecord> = {
    customCells: {
      nextRunTimeUtc: (row) =>
        row.nextRunTimeUtc && row.status
          ? dayjs(row.nextRunTimeUtc).format('YYYY-MM-DD HH:mm:ss')
          : '-',
    },
    customCardFields: (translate) => [
      { type: 'title', render: (row) => row.name },
      { type: 'subtitle', label: 'Key', render: (row) => row.jobKey },
      { type: 'content', label: 'Cron', render: (row) => row.cronExpression },
      { type: 'content', label: translate('cron.field.runCount'), render: (row) => row.runCount },
      {
        type: 'tags',
        render: (row) => (
          <Chip
            label={row.status ? translate('status.enabled') : translate('status.disabled')}
            color={row.status ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />
        ),
      },
    ],
    rowActions: () => [
      {
        key: 'logs',
        icon: <HistoryIcon />,
        color: 'info',
        permissionCodes: [permissions.admin.maintenance.cron.read],
        onClick: (row) => {
          setSelectedJob(row);
          setLogDialogOpen(true);
        },
      },
    ],
    customFormFields: {
      jobKey: (ctx) => {
        const disabledSuffix = ctx.t('status.disabled');
        const options = apiTasks.map((item) => ({
          label: `${item.name} (${item.taskKey})${!item.isEnabled ? ` - [${disabledSuffix}]` : ''}`,
          value: item.taskKey,
        }));
        return (
          <CronJobKeyField
            label={ctx.t('cron.field.jobKey')}
            value={ctx.form.jobKey || ''}
            options={options}
            disabled={ctx.disabled}
            setForm={ctx.setForm}
          />
        );
      },
      cronExpression: (ctx) => (
        <Stack spacing={2}>
          <Field
            name="cronExpression"
            label={ctx.t('cron.field.cronExpression')}
            value={ctx.form.cronExpression || ''}
            onChange={(e) => ctx.setForm((prev) => ({ ...prev, cronExpression: e.target.value }))}
            required
            disabled={ctx.disabled}
            fullWidth
            size="medium"
            placeholder={ctx.t('cron.field.cronExpressionPlaceholder')}
          />
          <CronHelper value={ctx.form.cronExpression || ''} />
        </Stack>
      ),
    },
    dialogs: () => (
      <LogDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} job={selectedJob} />
    ),
  };

  return <ContractCrudPage contract={adminMaintenanceCronContract} extensions={extensions} />;
}
