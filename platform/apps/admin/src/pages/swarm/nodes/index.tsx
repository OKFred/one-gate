import { useState } from 'react';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import { adminSwarmNodesContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { permissions } from '@/hooks/usePermission';
import { listNodesFn } from '@/api/admin/swarm/nodes';
import type { SwarmNodeObj } from '@/api/admin/swarm/type';
import TheNodeDetail from './components/TheNodeDetail';

type NodeRow = SwarmNodeObj & Record<string, unknown>;

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function SwarmNodesManagement() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<SwarmNodeObj | null>(null);

  const extensions: CrudExtensions<NodeRow> = {
    listAdapter: async (args) => {
      const res = await listNodesFn({ data: {} });
      let list = (res.data?.data ?? []) as unknown as NodeRow[];
      const keyword =
        typeof args.data?.keyword === 'string' ? args.data.keyword.toLowerCase().trim() : '';
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
          ok: true,
          data: {
            list,
            total: list.length,
          },
        },
      };
    },
    customCells: {
      hostname: (row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {row.hostname || '-'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.id.substring(0, 12)}...
          </Typography>
        </Box>
      ),
      allocatedCpus: (row) => {
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
      allocatedMemory: (row) => {
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
      runningTaskCount: (row) => (
        <Chip
          label={`${row.runningTaskCount} 个容器`}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    customCardFields: (t) => [
      { type: 'title', label: t('swarm.nodes.hostname'), render: (row) => row.hostname || '-' },
      { type: 'content', label: t('swarm.nodes.role'), render: (row) => row.role || '-' },
      { type: 'content', label: t('swarm.nodes.status'), render: (row) => row.status || '-' },
      {
        type: 'content',
        label: t('swarm.nodes.taskCount'),
        render: (row) => `${row.runningTaskCount} 个容器`,
      },
    ],
    rowActions: () => [
      {
        key: 'inspect',
        color: 'info',
        icon: <ViewIcon />,
        permissionCodes: [permissions.admin.swarm.nodes.read],
        onClick: (row) => {
          setDetailRow(row);
          setDetailOpen(true);
        },
      },
    ],
    dialogs: () => (
      <TheNodeDetail
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailRow(null);
        }}
        node={detailRow}
      />
    ),
  };

  return <ContractCrudPage contract={adminSwarmNodesContract} extensions={extensions} />;
}
