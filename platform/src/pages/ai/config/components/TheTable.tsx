import { Chip, Box, CircularProgress } from '@mui/material';
import { QuestionMark as VerifyIcon } from '@mui/icons-material';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAiConfigReq, ListAiConfigRes } from '@/api/ai/type';
import type { FilterState } from './TheFilter';
import { AI } from '@/hooks/usePermission';

export type AiConfigRes = NonNullable<ListAiConfigRes['list']>[0];

export interface TableExtraContext {
  verifyingId: number | null;
  handleVerify: (id: number) => Promise<void>;
}

export const tableConfig: SchemaCrudConfig<
  AiConfigRes,
  FilterState,
  ListAiConfigReq,
  TableExtraContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('ai.config.name'), render: (row) => row.name },
    { title: t('ai.config.provider'), render: (row) => row.provider },
    { title: t('ai.config.model'), render: (row) => row.model },
    {
      title: t('ai.config.capabilities'),
      render: (row) => {
        let caps: string[] = [];
        try {
          caps = JSON.parse(row.capabilities || '[]');
        } catch {
          caps = [];
        }
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {caps.map((cap) => (
              <Chip key={cap} label={cap} size="small" />
            ))}
          </Box>
        );
      },
    },
    {
      title: t('ai.config.isDefault'),
      render: (row) => (
        <Chip
          label={row.isDefault ? t('dialog.yes') : t('dialog.no')}
          color={row.isDefault ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      title: t('status.enabled'),
      render: (row) => (
        <Chip
          label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
          color={row.isEnabled ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      ),
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.name },
    {
      type: 'subtitle',
      label: t('ai.config.model'),
      render: (row) => `${row.provider} - ${row.model}`,
    },
    {
      type: 'content',
      label: t('ai.config.capabilities'),
      render: (row) => {
        let caps: string[] = [];
        try {
          caps = JSON.parse(row.capabilities || '[]');
        } catch {
          caps = [];
        }
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {caps.map((cap) => (
              <Chip key={cap} label={cap} size="small" />
            ))}
          </Box>
        );
      },
    },
    {
      type: 'tags',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            color={row.isEnabled ? 'success' : 'error'}
            size="small"
          />
          {row.isDefault && <Chip label={t('ai.config.isDefault')} color="success" size="small" />}
        </Box>
      ),
    },
  ],

  actions: (_t, extraContext) => [
    {
      key: 'verify',
      label: _t('ai.config.verify'),
      color: 'success',
      permissionCodes: [AI.CONFIG.READ],
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
};
