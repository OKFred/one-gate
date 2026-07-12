import { THIS_PERMISSION } from '../constant';
import { Chip, CircularProgress } from '@mui/material';
import { QuestionMark as VerifyIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { ListDockerConfigReq } from '@/api/admin/swarm/type';

export interface SwarmDockerConfigRes {
  id: number;
  name: string;
  host: string;
  apiVersion?: string | null;
  tlsVerify: boolean;
  caCert?: string | null;
  clientCert?: string | null;
  clientKey?: string | null;
  cfMtlsBinding?: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  createTimeUtc?: number | null;
  updateTimeUtc?: number | null;
  remark?: string | null;
}

export interface TableExtraContext {
  verifyingId: number | null;
  handleVerify: (id: number) => Promise<void>;
}

export const tableConfig: SchemaCrudConfig<
  SwarmDockerConfigRes,
  FilterState,
  ListDockerConfigReq,
  TableExtraContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('swarm.docker_config.name'), render: (row) => row.name },
    { title: t('swarm.docker_config.host'), render: (row) => row.host },
    {
      title: t('swarm.docker_config.tlsVerify'),
      render: (row) => (
        <Chip
          label={row.tlsVerify ? t('column.yes') : t('column.no')}
          color={row.tlsVerify ? 'primary' : 'default'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      title: t('swarm.docker_config.isDefault'),
      render: (row) =>
        row.isDefault ? (
          <Chip
            label={t('swarm.docker_config.defaultLabel')}
            color="primary"
            size="small"
            variant="outlined"
          />
        ) : (
          '-'
        ),
    },
    {
      title: t('status.enabled'),
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
      render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.name },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    { type: 'content', label: t('swarm.docker_config.host'), render: (row) => row.host },
    {
      type: 'tags',
      render: (row) => (
        <>
          {row.isDefault && (
            <Chip label={t('swarm.docker_config.defaultLabel')} color="primary" size="small" />
          )}
          {row.tlsVerify && <Chip label="TLS" color="secondary" size="small" />}
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            color={row.isEnabled ? 'success' : 'default'}
            size="small"
          />
        </>
      ),
    },
  ],

  actions: (_t, extraContext) => [
    {
      key: 'verify',
      label: _t('swarm.docker_config.actions.verify'),
      color: 'success',
      permissionCodes: [THIS_PERMISSION.read],
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
