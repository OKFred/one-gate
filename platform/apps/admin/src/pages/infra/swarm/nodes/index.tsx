import { useState, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { listNodesFn } from '@/api/infra/swarm/nodes';
import { SWARM } from '@/hooks/usePermission';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { SwarmNodeObj } from '@/api/infra/swarm/type';
import TheNodeDetail from './components/TheNodeDetail';
import { Chip, Box, Typography, LinearProgress } from '@mui/material';

interface NodeContext {
  onInspect: (row: SwarmNodeObj) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function SwarmNodesManagement() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<SwarmNodeObj | null>(null);

  const extraContext = useMemo<NodeContext>(
    () => ({
      onInspect: (row) => {
        setDetailRow(row);
        setDetailOpen(true);
      },
    }),
    [],
  );

  const config: SchemaCrudConfig<
    SwarmNodeObj,
    { keyword: string },
    { keyword?: string },
    NodeContext
  > = {
    apiKeyName: 'id',
    api: {
      list: async (args) => {
        const res = await listNodesFn({ data: {} });
        let list = (res.data?.data || []) as unknown as SwarmNodeObj[];
        const keyword = (args.data?.keyword || '').toLowerCase().trim();
        if (keyword) {
          list = list.filter(
            (item) =>
              item.hostname.toLowerCase().includes(keyword) ||
              item.id.toLowerCase().includes(keyword) ||
              item.role.toLowerCase().includes(keyword) ||
              item.ip.toLowerCase().includes(keyword),
          );
        }
        return {
          data: {
            data: {
              list,
              total: list.length,
            },
          },
        };
      },
    },
    filter: {
      defaultFilters: { keyword: '' },
      fields: (t) => [
        {
          name: 'keyword',
          label: t('swarm.docker.searchLabel'),
          type: 'text',
          placeholder: t('swarm.docker.searchPlaceholder'),
          sx: { width: '100%' },
        },
      ],
      transformRequest: (filters) => ({
        keyword: filters.keyword || undefined,
      }),
    },
    table: {
      columns: (t) => [
        {
          title: t('swarm.nodes.hostname'),
          render: (row) => (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {row.hostname || '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.id.substring(0, 12)}...
              </Typography>
            </Box>
          ),
        },
        {
          title: t('swarm.nodes.role'),
          render: (row) => {
            if (row.role === 'manager') {
              return (
                <Chip
                  label={t('swarm.nodes.manager')}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              );
            }
            return (
              <Chip
                label={t('swarm.nodes.worker')}
                color="default"
                size="small"
                variant="outlined"
              />
            );
          },
        },
        {
          title: t('swarm.nodes.status'),
          render: (row) => {
            if (row.status === 'ready') {
              return (
                <Chip
                  label={t('swarm.nodes.ready')}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                    color: '#4CAF50',
                    border: '1px solid rgba(76, 175, 80, 0.3)',
                    fontWeight: 'medium',
                  }}
                />
              );
            } else if (row.status === 'down') {
              return (
                <Chip
                  label={t('swarm.nodes.down')}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                    color: '#F44336',
                    border: '1px solid rgba(244, 67, 54, 0.3)',
                    fontWeight: 'medium',
                  }}
                />
              );
            }
            return (
              <Chip
                label={t('swarm.nodes.disconnected')}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 152, 0, 0.1)',
                  color: '#FF9800',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  fontWeight: 'medium',
                }}
              />
            );
          },
        },
        {
          title: t('swarm.nodes.availability'),
          render: (row) => {
            if (row.availability === 'active') {
              return (
                <Chip
                  label={t('swarm.nodes.active')}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(33, 150, 243, 0.1)',
                    color: '#2196F3',
                    border: '1px solid rgba(33, 150, 243, 0.3)',
                    fontWeight: 'medium',
                  }}
                />
              );
            } else if (row.availability === 'drain') {
              return (
                <Chip
                  label={t('swarm.nodes.drain')}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(156, 39, 176, 0.1)',
                    color: '#9C27B0',
                    border: '1px solid rgba(156, 39, 176, 0.3)',
                    fontWeight: 'medium',
                  }}
                />
              );
            }
            return (
              <Chip
                label={t('swarm.nodes.pause')}
                size="small"
                sx={{
                  bgcolor: 'rgba(158, 158, 158, 0.1)',
                  color: '#9E9E9E',
                  border: '1px solid rgba(158, 158, 158, 0.3)',
                  fontWeight: 'medium',
                }}
              />
            );
          },
        },
        { title: t('swarm.nodes.ip'), render: (row) => row.ip || '-' },
        {
          title: t('swarm.nodes.allocatedCpus'),
          render: (row) => {
            const ratio = row.nanoCpus > 0 ? (row.allocatedCpus / row.nanoCpus) * 100 : 0;
            const progressColor = ratio > 80 ? 'error' : ratio > 50 ? 'warning' : 'success';
            return (
              <Box sx={{ width: 140 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {row.allocatedCpus} / {row.nanoCpus} 核
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(ratio)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(ratio, 100)}
                  color={progressColor}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            );
          },
        },
        {
          title: t('swarm.nodes.allocatedMemory'),
          render: (row) => {
            const ratio = row.memoryBytes > 0 ? (row.allocatedMemory / row.memoryBytes) * 100 : 0;
            const progressColor = ratio > 80 ? 'error' : ratio > 50 ? 'warning' : 'success';
            return (
              <Box sx={{ width: 140 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {formatBytes(row.allocatedMemory)} / {formatBytes(row.memoryBytes)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(ratio)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(ratio, 100)}
                  color={progressColor}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            );
          },
        },
        {
          title: t('swarm.nodes.taskCount'),
          render: (row) => (
            <Chip
              label={`${row.runningTaskCount} 个容器`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 'bold' }}
            />
          ),
        },
        { title: t('swarm.nodes.engineVersion'), render: (row) => row.engineVersion || '-' },
      ],
      cardFields: (t) => [
        { label: t('swarm.nodes.hostname'), render: (row) => row.hostname || '-' },
        { label: t('swarm.nodes.role'), render: (row) => row.role || '-' },
        { label: t('swarm.nodes.status'), render: (row) => row.status || '-' },
        { label: t('swarm.nodes.taskCount'), render: (row) => `${row.runningTaskCount} 个容器` },
      ],
      actions: (_, context) => [
        {
          key: 'inspect',
          color: 'info',
          icon: <ViewIcon />,
          permissionCodes: [SWARM.NODES.READ],
          onClick: (row) => {
            context?.onInspect(row);
          },
        },
      ],
    },
    form: {
      schema: { type: 'object' },
      defaultForm: {},
    },
  };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />

      <TheNodeDetail
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailRow(null);
        }}
        node={detailRow}
      />
    </>
  );
}
