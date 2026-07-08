import { useState } from 'react';
import { PlayArrow as PlayIcon, SystemUpdateAlt as ImportIcon } from '@mui/icons-material';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as ApiTaskAPI from '@/api/infra/maintenance/api-task';
import { THIS_PERMISSION, FULL_PREFIX } from '../constant';
import { useTranslation } from '@/hooks/useTranslation';
import type { ApiTaskObj, ListApiTaskReq } from '@/api/infra/maintenance/type';
import { Button, Chip, Typography } from '@mui/material';
import dayjs from 'dayjs';

// Subcomponents
import { TheForm } from './components/TheForm';
import { RunTestDialog } from './components/RunTestDialog';
import { ImportDialog } from './components/ImportDialog';

const DEFAULT_FORM: Partial<ApiTaskObj> = {
  taskKey: '',
  name: '',
  description: '',
  baseUrl: '',
  path: '',
  method: 'GET',
  headers: '',
  requestSchema: '',
  responseSchema: '',
  timeoutMs: 5000,
  isEnabled: true,
};

const defaultFilters = {
  keyword: '',
  isEnabled: undefined as boolean | undefined,
};

export default function ApiTaskManagement() {
  const t = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ApiTaskObj | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const config: SchemaCrudConfig<ApiTaskObj, typeof defaultFilters, ListApiTaskReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.api_task.add],
      edit: [THIS_PERMISSION.api_task.edit],
      delete: [THIS_PERMISSION.api_task.delete],
    },
    api: {
      list: ApiTaskAPI.listFn,
      add: ApiTaskAPI.addFn,
      update: ApiTaskAPI.updateFn,
      delete: ApiTaskAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: (t) => [
        {
          name: 'keyword',
          type: 'text',
          label: t('filter.keyword'),
          placeholder: t('apiTask.filter.keywordPlaceholder'),
        },
        {
          name: 'isEnabled',
          type: 'select',
          label: t('filter.enabledStatus'),
          options: [
            { label: t('filter.all'), value: undefined },
            { label: t('status.enabled'), value: true },
            { label: t('status.disabled'), value: false },
          ],
        },
      ],
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
          isEnabled: filters.isEnabled,
        }) as ListApiTaskReq,
    },
    table: {
      columns: (t) => [
        { title: t('columns.id'), render: (row) => row.id },
        { title: t('apiTask.field.name'), render: (row) => row.name },
        { title: t('apiTask.field.taskKey'), render: (row) => row.taskKey },
        {
          title: t('apiTask.field.method'),
          render: (row) => (
            <Chip
              label={row.method}
              color={
                row.method === 'GET'
                  ? 'info'
                  : row.method === 'POST'
                    ? 'success'
                    : row.method === 'DELETE'
                      ? 'error'
                      : 'warning'
              }
              size="small"
              variant="outlined"
            />
          ),
        },
        {
          title: 'URL',
          render: (row) => (
            <Typography variant="body2" noWrap sx={{ maxWidth: 280, fontFamily: 'monospace' }}>
              {row.baseUrl}
              {row.path}
            </Typography>
          ),
        },
        {
          title: t('apiTask.field.status'),
          render: (row) => (
            <Chip
              label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
              color={row.isEnabled ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
          ),
        },
        {
          title: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
      ],
      cardFields: (t) => [
        { type: 'title', render: (row) => row.name },
        { type: 'subtitle', label: t('apiTask.field.taskKey'), render: (row) => row.taskKey },
        {
          type: 'content',
          label: 'URL',
          render: (row) => `${row.method} ${row.baseUrl}${row.path}`,
        },
        {
          type: 'tags',
          render: (row) => (
            <Chip
              label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
              color={row.isEnabled ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
          ),
        },
      ],
      actions: () => [
        {
          key: 'run',
          icon: <PlayIcon />,
          color: 'success',
          permissionCodes: [THIS_PERMISSION.api_task.edit],
          onClick: (row) => {
            setSelectedTask(row);
            setRunDialogOpen(true);
          },
        },
      ],
    },
    form: {
      schema: `${FULL_PREFIX}.api_taskAddReq`,
      defaultForm: DEFAULT_FORM,
      afterOpen: (form, isEdit, row) => {
        if (isEdit && row) {
          return {
            ...form,
            name: row.name,
            taskKey: row.taskKey,
            description: row.description || '',
            baseUrl: row.baseUrl,
            path: row.path,
            method: row.method,
            headers: row.headers || '',
            requestSchema: row.requestSchema || '',
            responseSchema: row.responseSchema || '',
            timeoutMs: row.timeoutMs,
            isEnabled: row.isEnabled,
          };
        }
        return { ...DEFAULT_FORM };
      },
      renderForm: (form, setForm, _errorContextValue, t) => (
        <TheForm form={form} setForm={setForm} t={t} />
      ),
    },
  };

  return (
    <>
      <SchemaCrudPage
        key={refreshKey}
        config={config}
        customActions={
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            {t('apiTask.button.importFromDocs')}
          </Button>
        }
      />

      {/* 立即执行测试弹窗 */}
      <RunTestDialog
        open={runDialogOpen}
        onClose={() => setRunDialogOpen(false)}
        selectedTask={selectedTask}
      />

      {/* 从文档导入弹窗 */}
      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </>
  );
}
