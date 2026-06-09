import { useState, useTransition } from 'react';
import { PlayArrow as PlayIcon } from '@mui/icons-material';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as ScriptAPI from '@/api/maintenance/script';
import { MAINTENANCE } from '@/hooks/usePermission';
import type { ScriptObj, ListScriptReq } from '@/api/maintenance/type';
import scriptFormSchema from '@/assets/schemas/maintenance.scriptAddReq.json';
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
} from '@mui/material';
import { Field } from '@/components/Form';
import dayjs from 'dayjs';

// 2. 表单默认值
const DEFAULT_FORM: Partial<ScriptObj> = {
  name: '',
  scriptKey: '',
  description: '',
  code: `export default async function({ params, db }) {\n  console.log("执行脚本中，参数为:", params);\n  // 在这里编写你的逻辑\n  return { success: true };\n}`,
  isEnabled: true,
};

// 3. 过滤条件默认值
const defaultFilters = {
  keyword: '',
  isEnabled: undefined as boolean | undefined,
};

export default function ScriptManagement() {
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ScriptObj | null>(null);
  const [paramsInput, setParamsInput] = useState('{\n  "test": true\n}');
  const [isRunning, startRunning] = useTransition();
  const [runResult, setRunResult] = useState<{
    success?: boolean;
    durationMs?: number;
    errorMessage?: string | null;
    result?: unknown;
  } | null>(null);

  const handleRunTest = () => {
    if (!selectedScript) return;
    setRunResult(null);
    startRunning(async () => {
      try {
        const response = await ScriptAPI.runTestFn({
          data: {
            id: selectedScript.id,
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
          durationMs: 0,
          errorMessage: error.response?.data?.message || error.message || String(err),
        });
      }
    });
  };

  const config: SchemaCrudConfig<ScriptObj, typeof defaultFilters, ListScriptReq> = {
    titleKey: 'sidebar.menu.maintenance.script',
    apiKeyName: 'id',
    permissions: {
      add: [MAINTENANCE.SCRIPT.ADD],
      edit: [MAINTENANCE.SCRIPT.EDIT],
      delete: [MAINTENANCE.SCRIPT.DELETE],
    },
    api: {
      list: ScriptAPI.listFn,
      add: ScriptAPI.addFn,
      update: ScriptAPI.updateFn,
      delete: ScriptAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: (t) => [
        {
          name: 'keyword',
          type: 'text',
          label: t('filter.keyword'),
          placeholder: t('script.filter.keywordPlaceholder'),
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
        }) as ListScriptReq,
    },
    table: {
      columns: (t) => [
        { title: t('columns.id'), render: (row) => row.id },
        { title: t('script.field.name'), render: (row) => row.name },
        { title: t('script.field.scriptKey'), render: (row) => row.scriptKey },
        { title: t('script.field.description'), render: (row) => row.description || '-' },
        {
          title: t('script.field.status'),
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
        { type: 'subtitle', label: 'Key', render: (row) => row.scriptKey },
        {
          type: 'content',
          label: t('script.field.description'),
          render: (row) => row.description || '-',
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
          permissionCodes: [MAINTENANCE.SCRIPT.EDIT],
          onClick: (row) => {
            setSelectedScript(row);
            setParamsInput('{\n  "test": true\n}');
            setRunResult(null);
            setRunDialogOpen(true);
          },
        },
      ],
    },
    form: {
      schema: scriptFormSchema,
      defaultForm: DEFAULT_FORM,
      afterOpen: (form, isEdit, row) => {
        if (isEdit && row) {
          return {
            ...form,
            name: row.name || '',
            scriptKey: row.scriptKey || '',
            description: row.description || '',
            code: row.code || '',
            isEnabled: row.isEnabled ?? true,
          };
        }
        return {
          ...form,
          name: '',
          scriptKey: '',
          description: '',
          code: DEFAULT_FORM.code || '',
          isEnabled: true,
        };
      },
      renderForm: (form, setForm, _errorContextValue, t) => (
        <Box sx={{ pt: 2 }}>
          <Stack spacing={3}>
            <Field
              name="name"
              label={t('script.field.name')}
              value={form.name || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
              size="medium"
              placeholder={t('form.pleaseEnter')}
            />

            <Field
              name="scriptKey"
              label={t('script.field.scriptKey')}
              value={form.scriptKey || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, scriptKey: e.target.value }))}
              required
              fullWidth
              disabled={form.id !== undefined} // 编辑时禁用 Key 修改以防引起定时任务映射断开
              size="medium"
              placeholder={t('form.pleaseEnter')}
            />

            <Field
              name="description"
              label={t('script.field.description')}
              value={form.description || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              size="medium"
              placeholder={t('form.pleaseEnter')}
            />

            <Field
              name="isEnabled"
              label={t('script.field.status')}
              type="switch"
              value={!!form.isEnabled}
              onChange={(checked: boolean) => setForm((prev) => ({ ...prev, isEnabled: checked }))}
            />

            <Field
              name="code"
              label={t('script.field.code')}
              value={form.code || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              required
              fullWidth
              multiline
              rows={15}
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: '"Fira Code", "Courier New", Courier, monospace',
                  fontSize: '13px',
                  backgroundColor: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: '12px',
                  borderRadius: '4px',
                  lineHeight: '1.5',
                },
                '& .MuiInputLabel-root': {
                  color: '#999',
                },
                '& .MuiInputLabel-shrink': {
                  color: '#1976d2',
                },
              }}
              placeholder={`export default async function({ params, db }) {\n  console.log("参数是:", params);\n}`}
            />
          </Stack>
        </Box>
      ),
    },
  };

  return (
    <>
      <SchemaCrudPage config={config} />

      {/* 立即执行/脚本测试的弹窗 */}
      <Dialog
        open={runDialogOpen}
        onClose={() => !isRunning && setRunDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          运行脚本测试: {selectedScript?.name} ({selectedScript?.scriptKey})
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              请在下方输入传递给脚本的 JSON 参数对象：
            </Typography>
            <Field
              name="paramsInput"
              label="JSON 参数"
              value={paramsInput}
              onChange={(e) => setParamsInput(e.target.value)}
              fullWidth
              multiline
              rows={5}
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: '"Fira Code", "Courier New", Courier, monospace',
                  fontSize: '13px',
                  backgroundColor: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: '12px',
                  borderRadius: '4px',
                },
              }}
            />

            {/* 执行结果控制台回显 */}
            {runResult && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  执行结果回显:
                </Typography>
                <Box
                  sx={{
                    fontFamily: '"Fira Code", "Courier New", Courier, monospace',
                    fontSize: '13px',
                    backgroundColor: '#0d0d0d',
                    color: runResult.success ? '#4caf50' : '#f44336',
                    padding: '16px',
                    borderRadius: '4px',
                    borderLeft: `4px solid ${runResult.success ? '#4caf50' : '#f44336'}`,
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}
                >
                  <Box sx={{ mb: 1 }}>
                    状态: <strong>{runResult.success ? 'SUCCESS (成功)' : 'FAILED (失败)'}</strong>
                  </Box>
                  {runResult.result !== undefined && (
                    <Box sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                      结果:{' '}
                      <strong>
                        {runResult.result === null
                          ? 'null'
                          : typeof runResult.result === 'object'
                            ? JSON.stringify(runResult.result, null, 2)
                            : String(runResult.result)}
                      </strong>
                    </Box>
                  )}
                  <Box sx={{ mb: 1 }}>
                    执行耗时: <strong>{runResult.durationMs} ms</strong>
                  </Box>
                  {runResult.errorMessage && (
                    <Box sx={{ mt: 1, color: '#f44336', whiteSpace: 'pre-wrap' }}>
                      错误信息: {runResult.errorMessage}
                    </Box>
                  )}
                  {runResult.success && !runResult.errorMessage && (
                    <Box sx={{ mt: 1, color: '#81c784' }}>
                      ✓ 脚本在服务器端执行完毕，没有抛出任何异常。
                    </Box>
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
