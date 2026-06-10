import { useState, useTransition } from 'react';
import { PlayArrow as PlayIcon } from '@mui/icons-material';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as ApiTaskAPI from '@/api/maintenance/api-task';
import { MAINTENANCE } from '@/hooks/usePermission';
import type { ApiTaskObj, ListApiTaskReq } from '@/api/maintenance/type';
import {
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import { Field } from '@/components/Form';
import dayjs from 'dayjs';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const DEFAULT_FORM: Partial<ApiTaskObj> = {
  name: '',
  taskKey: '',
  description: '',
  baseUrl: '',
  path: '/',
  method: 'GET',
  headers: '',
  requestSchema: '',
  responseSchema: '',
  timeoutMs: 30000,
  isEnabled: true,
};

const defaultFilters = {
  keyword: '',
  isEnabled: undefined as boolean | undefined,
};

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

const apiTaskFormSchema = {
  type: 'object',
  properties: {
    taskKey: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    description: { type: ['string', 'null'] },
    baseUrl: { type: 'string', minLength: 1 },
    path: { type: 'string', minLength: 1 },
    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    headers: { type: ['string', 'null'] },
    requestSchema: { type: ['string', 'null'] },
    responseSchema: { type: ['string', 'null'] },
    timeoutMs: { type: 'number' },
    isEnabled: { type: 'boolean' },
  },
  required: ['taskKey', 'name', 'baseUrl', 'path', 'method', 'timeoutMs', 'isEnabled'],
};

export default function ApiTaskManagement() {
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ApiTaskObj | null>(null);
  const [paramsInput, setParamsInput] = useState('{}');
  const [isRunning, startRunning] = useTransition();
  const [runResult, setRunResult] = useState<{
    success?: boolean;
    statusCode?: number;
    durationMs?: number;
    responseBody?: string | null;
    errorMessage?: string | null;
  } | null>(null);

  const handleRunTest = () => {
    if (!selectedTask) return;
    setRunResult(null);
    startRunning(async () => {
      try {
        const response = await ApiTaskAPI.runTestFn({
          data: {
            id: selectedTask.id,
            parameters: paramsInput.trim() || null,
          },
        });
        if (response?.data?.data) {
          setRunResult(response.data.data);
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        setRunResult({
          success: false,
          statusCode: 0,
          durationMs: 0,
          errorMessage: error.response?.data?.message || error.message || String(err),
        });
      }
    });
  };

  const config: SchemaCrudConfig<ApiTaskObj, typeof defaultFilters, ListApiTaskReq> = {
    titleKey: 'sidebar.menu.maintenance.apiTask',
    apiKeyName: 'id',
    permissions: {
      add: [MAINTENANCE.API_TASK.ADD],
      edit: [MAINTENANCE.API_TASK.EDIT],
      delete: [MAINTENANCE.API_TASK.DELETE],
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
        { type: 'subtitle', label: 'Key', render: (row) => row.taskKey },
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
          permissionCodes: [MAINTENANCE.API_TASK.EDIT],
          onClick: (row) => {
            setSelectedTask(row);
            setParamsInput('{}');
            setRunResult(null);
            setRunDialogOpen(true);
          },
        },
      ],
    },
    form: {
      schema: apiTaskFormSchema,
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
                disabled={(form as ApiTaskObj).id !== undefined}
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
                value={form.timeoutMs ?? 30000}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, timeoutMs: Number(e.target.value) }))
                }
                required
                sx={{ minWidth: 160 }}
              />
              <Field
                name="isEnabled"
                label={t('apiTask.field.status')}
                type="switch"
                value={!!form.isEnabled}
                onChange={(checked: boolean) =>
                  setForm((prev) => ({ ...prev, isEnabled: checked }))
                }
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
      ),
    },
  };

  return (
    <>
      <SchemaCrudPage config={config} />

      {/* 立即执行测试弹窗 */}
      <Dialog
        open={runDialogOpen}
        onClose={() => !isRunning && setRunDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {selectedTask?.name} — 立即执行测试
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, fontFamily: 'monospace' }}
          >
            {selectedTask?.method} {selectedTask?.baseUrl}
            {selectedTask?.path}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedTask?.requestSchema && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  入参 Schema（OAS3 参考）：
                </Typography>
                <Box
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    bgcolor: '#0d1117',
                    color: '#8b949e',
                    p: 1.5,
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 120,
                    overflowY: 'auto',
                  }}
                >
                  {selectedTask.requestSchema}
                </Box>
              </Box>
            )}

            <Field
              name="paramsInput"
              label="JSON 入参（请求 Body / Query 参数）"
              value={paramsInput}
              onChange={(e) => setParamsInput(e.target.value)}
              fullWidth
              multiline
              rows={5}
              sx={monoStyle}
            />

            {runResult && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  执行结果：
                </Typography>
                <Box
                  sx={{
                    fontFamily: '"Fira Code", monospace',
                    fontSize: '13px',
                    bgcolor: '#0d0d0d',
                    color: runResult.success ? '#4caf50' : '#f44336',
                    p: 2,
                    borderRadius: 1,
                    borderLeft: `4px solid ${runResult.success ? '#4caf50' : '#f44336'}`,
                    maxHeight: 300,
                    overflowY: 'auto',
                  }}
                >
                  <Box sx={{ mb: 1 }}>
                    状态: <strong>{runResult.success ? 'SUCCESS' : 'FAILED'}</strong> ｜ HTTP{' '}
                    <strong>{runResult.statusCode}</strong> ｜ 耗时{' '}
                    <strong>{runResult.durationMs} ms</strong>
                  </Box>
                  {runResult.responseBody && (
                    <Box sx={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', mt: 1 }}>
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(runResult.responseBody), null, 2);
                        } catch {
                          return runResult.responseBody;
                        }
                      })()}
                    </Box>
                  )}
                  {runResult.errorMessage && (
                    <Box sx={{ mt: 1, color: '#f44336' }}>错误: {runResult.errorMessage}</Box>
                  )}
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button disabled={isRunning} onClick={() => setRunDialogOpen(false)} variant="outlined">
            关闭
          </Button>
          <Button
            onClick={handleRunTest}
            variant="contained"
            color="success"
            startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : <PlayIcon />}
            disabled={isRunning}
          >
            {isRunning ? '执行中...' : '立即执行'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
