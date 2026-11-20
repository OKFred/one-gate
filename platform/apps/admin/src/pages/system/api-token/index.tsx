import { useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { adminSystemApiTokenContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListApiTokenRes } from '@/api/admin/system/type';

type ApiTokenRecord = NonNullable<ListApiTokenRes['list']>[number] & Record<string, unknown>;

function formatPermissions(permissionsJson: string): { summary: string; full: string } {
  try {
    const codes = JSON.parse(permissionsJson) as unknown;
    if (!Array.isArray(codes) || codes.length === 0) {
      return { summary: '--', full: '--' };
    }
    const list = codes.map((c) => String(c));
    const summary =
      list.length <= 2 ? list.join(', ') : `${list.slice(0, 2).join(', ')} +${list.length - 2}`;
    return { summary, full: list.join('\n') };
  } catch {
    return { summary: permissionsJson, full: permissionsJson };
  }
}

function getEffectiveStatus(row: ApiTokenRecord): {
  label: string;
  color: 'success' | 'error' | 'warning';
} {
  if (row.status === 'revoked') return { label: 'Revoked', color: 'error' };
  if (row.expireTimeUtc && Date.now() > row.expireTimeUtc) {
    return { label: 'Expired', color: 'warning' };
  }
  if (row.startTimeUtc && Date.now() < row.startTimeUtc) {
    return { label: 'Pending', color: 'warning' };
  }
  return { label: 'Active', color: 'success' };
}

export default function ApiTokenManagement() {
  const t = useTranslation();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [rawToken, setRawToken] = useState('');

  const handleCloseTokenDialog = () => {
    setTokenDialogOpen(false);
    setRawToken('');
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(rawToken);
      showSnackbar({ message: t('apiToken.copied'), type: 'success' });
    } catch {
      // Clipboard API unavailable
    }
  };

  const extensions: CrudExtensions<ApiTokenRecord> = {
    customCells: {
      permissions: (row): ReactNode => {
        const { summary, full } = formatPermissions(row.permissions);
        return (
          <Tooltip title={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{full}</pre>} arrow>
            <span>{summary}</span>
          </Tooltip>
        );
      },
      status: (row): ReactNode => {
        const { label, color } = getEffectiveStatus(row);
        return <Chip label={label} color={color} size="small" variant="outlined" />;
      },
    },
    customCardFields: (translate) => [
      { type: 'title', render: (row) => row.name },
      {
        type: 'subtitle',
        label: translate('apiToken.tokenPrefix'),
        render: (row) => `${row.tokenPrefix}••••`,
      },
      {
        type: 'content',
        label: translate('apiToken.permissions'),
        render: (row) => formatPermissions(row.permissions).summary,
      },
      {
        type: 'content',
        label: translate('apiToken.lastUsed'),
        render: (row) =>
          row.lastUsedTimeUtc ? dayjs(row.lastUsedTimeUtc).format('YYYY-MM-DD HH:mm') : '--',
      },
      {
        type: 'content',
        label: translate('apiToken.expireTime'),
        render: (row) =>
          row.expireTimeUtc
            ? dayjs(row.expireTimeUtc).format('YYYY-MM-DD HH:mm')
            : translate('apiToken.never'),
      },
      {
        type: 'tags',
        render: (row) => {
          const { label, color } = getEffectiveStatus(row);
          return <Chip label={label} color={color} size="small" />;
        },
      },
    ],
    afterAdd: (response) => {
      const res = response as { data?: { ok?: boolean; data?: { rawToken?: string } } } | undefined;
      if (res?.data?.ok === true && res.data.data?.rawToken) {
        setRawToken(res.data.data.rawToken);
        setTokenDialogOpen(true);
      }
    },
    dialogs: () => (
      <Dialog open={tokenDialogOpen} onClose={handleCloseTokenDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('apiToken.tokenCreated')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('apiToken.tokenOnceWarning')}
          </Alert>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            <Box component="span" sx={{ fontSize: '0.875rem' }}>
              {rawToken}
            </Box>
            <IconButton
              size="small"
              onClick={() => void handleCopyToken()}
              aria-label={t('apiToken.copied')}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTokenDialog} variant="contained">
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    ),
  };

  return <ContractCrudPage contract={adminSystemApiTokenContract} extensions={extensions} />;
}
