import React, { useState } from 'react';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { Chip, Switch } from '@mui/material';

import * as BaseSysConfigAPI from '@/api/admin/base/sys_config';
import type { ConfigRes, ListConfigReq } from '@/api/admin/base/type';
import { BaseSysConfigFormDialog } from './components/BaseSysConfigFormDialog';

// Extra context is useful if we need to trigger external state from inside config functions,
// but here we can just capture component state in the config closure.
// However, to keep config stable, we can pass them via extraContext.
interface ExtraContext {
  handleEdit: (row: ConfigRes) => void;
  refreshList: () => void;
}

export default function BaseSysConfigPage() {
  const t = useTranslation();

  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<ConfigRes | null>(null);

  // 用于触发 SchemaCrudPage 重新加载数据的 Key
  const [refreshKey, setRefreshKey] = useState(0);

  const extraContext: ExtraContext = {
    handleEdit: (row) => {
      setEditRow(row);
      setFormOpen(true);
    },
    refreshList: () => {
      setRefreshKey((prev) => prev + 1);
    },
  };

  const config: SchemaCrudConfig<
    ConfigRes,
    Record<string, unknown>,
    ListConfigReq,
    ExtraContext
  > = {
    apiKeyName: 'id',
    permissions: {
      delete: [], // add permission codes if needed
    },
    api: {
      list: BaseSysConfigAPI.listFn,
      delete: BaseSysConfigAPI.deleteFn,
      // Omit add and update so SchemaCrudPage doesn't render its own default buttons
    },
    filter: {
      defaultFilters: {},
      fields: () => [],
      transformRequest: () => ({}) as ListConfigReq,
    },
    table: {
      columns: () => [
        { title: 'ID', width: 80, render: (row: ConfigRes) => row.id },
        {
          title: t('admin.base.namespace'),
          render: (row: ConfigRes) => {
            const getColor = (str: string) => {
              if (!str) return 'default';
              const colors: Array<
                'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
              > = ['primary', 'secondary', 'error', 'info', 'success', 'warning'];
              const code = str.charCodeAt(0);
              return colors[code % colors.length];
            };
            return (
              <Chip
                label={row.namespace}
                size="small"
                color={getColor(row.namespace)}
                variant="outlined"
              />
            );
          },
        },
        {
          title: t('admin.base.configKey'),
          render: (row: ConfigRes) => row.configKey,
        },
        {
          title: t('common.isEnabled'),
          width: 100,
          render: (row: ConfigRes) => <Switch size="small" checked={!!row.isEnabled} readOnly />,
        },
        {
          title: t('admin.base.isPrimary'),
          width: 120,
          render: (row: ConfigRes) =>
            row.isPrimary ? <Chip label="Yes" size="small" color="success" /> : null,
        },
        {
          title: t('columns.createTime'),
          width: 180,
          render: (row: ConfigRes) => new Date(row.createTimeUtc as number).toLocaleString(),
        },
      ],
      cardFields: () => [],
      actions: (_t, ctx) => [
        {
          key: 'edit',
          icon: <EditIcon />,
          onClick: (row) => ctx?.handleEdit(row),
        },
      ],
    },
    form: {
      schema: {}, // Dummy
      defaultForm: {},
    },
  };

  const customActions = (
    <ResponsiveButton
      startIcon={<AddIcon />}
      variant="contained"
      color="primary"
      onClick={() => {
        setEditRow(null);
        setFormOpen(true);
      }}
    >
      {t('dialog.add')}
    </ResponsiveButton>
  );

  return (
    <React.Fragment key={refreshKey}>
      <SchemaCrudPage config={config} extraContext={extraContext} customActions={customActions} />

      {formOpen && (
        <BaseSysConfigFormDialog
          open={formOpen}
          editRow={editRow}
          onClose={() => setFormOpen(false)}
          onSuccess={() => {
            setFormOpen(false);
            extraContext.refreshList();
          }}
        />
      )}
    </React.Fragment>
  );
}
