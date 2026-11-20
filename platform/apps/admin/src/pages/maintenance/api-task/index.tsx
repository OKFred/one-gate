import { useState } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import {
  Code as CurlIcon,
  PlayArrow as PlayIcon,
  SystemUpdateAlt as ImportIcon,
} from '@mui/icons-material';
import { adminMaintenanceApiTaskContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { permissions } from '@/hooks/usePermission';
import type { ApiTaskObj } from '@/api/admin/maintenance/type';
import { RunTestDialog } from './components/RunTestDialog';
import { ImportDialog } from './components/ImportDialog';
import { CurlImportDialog } from './components/CurlImportDialog';

type ApiTaskRecord = ApiTaskObj & Record<string, unknown>;

export default function ApiTaskManagement() {
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ApiTaskRecord | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [curlImportDialogOpen, setCurlImportDialogOpen] = useState(false);

  const extensions: CrudExtensions<ApiTaskRecord> = {
    toolbarActions: (_helpers, translate) => (
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<CurlIcon />}
          onClick={() => setCurlImportDialogOpen(true)}
        >
          {translate('apiTask.button.importFromCurl')}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<ImportIcon />}
          onClick={() => setImportDialogOpen(true)}
        >
          {translate('apiTask.button.importFromDocs')}
        </Button>
      </Stack>
    ),
    customCells: {
      baseUrl: (row) => (
        <Typography variant="body2" noWrap sx={{ maxWidth: 280, fontFamily: 'monospace' }}>
          {row.baseUrl}
          {row.path}
        </Typography>
      ),
    },
    customCardFields: (translate) => [
      { type: 'title', render: (row) => row.name },
      { type: 'subtitle', label: translate('apiTask.field.taskKey'), render: (row) => row.taskKey },
      {
        type: 'content',
        label: 'URL',
        render: (row) => `${row.method} ${row.baseUrl}${row.path}`,
      },
      {
        type: 'tags',
        render: (row) => (
          <Chip
            label={row.isEnabled ? translate('status.enabled') : translate('status.disabled')}
            color={row.isEnabled ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />
        ),
      },
    ],
    rowActions: () => [
      {
        key: 'run',
        icon: <PlayIcon />,
        color: 'success',
        permissionCodes: [permissions.admin.maintenance.api_task.edit],
        onClick: (row) => {
          setSelectedTask(row);
          setRunDialogOpen(true);
        },
      },
    ],
    dialogs: (helpers) => (
      <>
        <RunTestDialog
          open={runDialogOpen}
          onClose={() => setRunDialogOpen(false)}
          selectedTask={selectedTask}
        />
        <ImportDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onSuccess={() => helpers.refreshTable()}
        />
        <CurlImportDialog
          open={curlImportDialogOpen}
          onClose={() => setCurlImportDialogOpen(false)}
          onSuccess={() => helpers.refreshTable()}
        />
      </>
    ),
  };

  return <ContractCrudPage contract={adminMaintenanceApiTaskContract} extensions={extensions} />;
}
