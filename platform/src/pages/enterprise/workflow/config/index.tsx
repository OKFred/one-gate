import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import schema from '@/assets/schemas/workflow.configAddReq.json';
import * as WorkflowAPI from '@/api/enterprise/workflow';
import type { ListConfigReq, ConfigObj } from '@/api/enterprise/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import { ENTERPRISE } from '@/hooks/usePermission';
import { Chip, Box, CircularProgress, TextField, FormControlLabel, Switch } from '@mui/material';

import { PlayArrow as VerifyIcon } from '@mui/icons-material';

interface FilterState {
  keyword: string;
}

interface TableExtraContext {
  verifyingId: number | null;
  handleVerify: (id: number) => Promise<void>;
}

const DEFAULT_FORM: Partial<ConfigObj> = {
  name: '',
  cdpUrl: '',
  isDefault: false,
  isEnabled: true,
  remark: '',
};

export default function WorkflowConfigManagement() {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const t = useTranslation();

  // 连通性测试
  const handleVerify = async (id: number) => {
    try {
      setVerifyingId(id);
      const res = await WorkflowAPI.verifyConfigFn({ data: { id } });
      if (res.data.data) {
        showSnackbar({
          message: t('workflow.config.verifySuccess') || 'CDP 浏览器环境连通性验证成功！',
          type: 'success',
        });
      } else {
        showSnackbar({
          message:
            t('workflow.config.verifyFailed') ||
            '验证失败，请确认 CDP WebSocket 服务是否正常开启。',
          type: 'error',
        });
      }
    } catch {
      showSnackbar({ message: '连通性验证请求出错，请重试。', type: 'error' });
    } finally {
      setVerifyingId(null);
    }
  };

  const extraContext: TableExtraContext = {
    verifyingId,
    handleVerify,
  };

  const config: SchemaCrudConfig<ConfigObj, FilterState, ListConfigReq, TableExtraContext> = {
    apiKeyName: 'id',
    permissions: {
      add: [ENTERPRISE.WORKFLOW_CONFIG.ADD],
      edit: [ENTERPRISE.WORKFLOW_CONFIG.EDIT],
      delete: [ENTERPRISE.WORKFLOW_CONFIG.DELETE],
    },
    api: {
      list: WorkflowAPI.listConfigFn,
      add: WorkflowAPI.addConfigFn,
      update: WorkflowAPI.updateConfigFn,
      delete: WorkflowAPI.deleteConfigFn,
    },
    filter: {
      defaultFilters: { keyword: '' },
      fields: (t) => [
        {
          name: 'keyword',
          label: t('search.keyword') || '关键词',
          type: 'text',
        },
      ],
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListConfigReq,
    },
    table: {
      columns: () => [
        { title: 'ID', render: (row) => row.id },
        { title: '配置名称', render: (row) => row.name },
        { title: 'CDP 调试地址', render: (row) => row.cdpUrl },
        {
          title: '默认环境',
          render: (row) => (
            <Chip
              label={row.isDefault ? '是' : '否'}
              color={row.isDefault ? 'success' : 'default'}
              size="small"
            />
          ),
        },
        {
          title: '状态',
          render: (row) => (
            <Chip
              label={row.isEnabled ? '启用' : '禁用'}
              color={row.isEnabled ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
          ),
        },
      ],
      cardFields: () => [
        { type: 'title', render: (row) => row.name },
        {
          type: 'subtitle',
          label: 'CDP 地址',
          render: (row) => row.cdpUrl,
        },
        {
          type: 'tags',
          render: (row) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                label={row.isEnabled ? '启用' : '禁用'}
                color={row.isEnabled ? 'success' : 'error'}
                size="small"
              />
              {row.isDefault && <Chip label="默认" color="success" size="small" />}
            </Box>
          ),
        },
      ],
      actions: (_t, extraContext) => [
        {
          key: 'verify',
          label: '测试连接',
          color: 'success',
          permissionCodes: [ENTERPRISE.WORKFLOW_CONFIG.READ],
          icon: (row) => {
            const isVerifying = extraContext?.verifyingId === row.id;
            return isVerifying ? <CircularProgress size={20} color="inherit" /> : <VerifyIcon />;
          },
          disabled: (row) => {
            return extraContext?.verifyingId === row.id;
          },
          onClick: async (row) => {
            if (row.id && extraContext?.handleVerify) {
              await extraContext.handleVerify(row.id);
            }
          },
        },
      ],
    },
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      renderForm: (form, setForm) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="配置名称"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="CDP 连接地址 (ws:// 或 host:port)"
            value={form.cdpUrl || ''}
            onChange={(e) => setForm({ ...form, cdpUrl: e.target.value })}
            fullWidth
            required
            helperText="示例: 127.0.0.1:9222 或 ws://127.0.0.1:9222/devtools/browser/..."
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
            }
            label="设为默认环境 (设置为默认后将自动取消其他环境的默认标识)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isEnabled !== false}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              />
            }
            label="启用环境"
          />
          <TextField
            label="备注"
            value={form.remark || ''}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </Box>
      ),
    },
  };

  return <SchemaCrudPage config={config} extraContext={extraContext} />;
}
