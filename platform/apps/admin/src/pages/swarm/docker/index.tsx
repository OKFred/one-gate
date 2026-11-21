import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  Visibility as ViewIcon,
  Article as LogIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { Box, Button, Divider, IconButton, MenuItem, Tooltip, Typography } from '@mui/material';
import { adminSwarmDockerContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { TextField } from '@/components/Form';
import { permissions } from '@/hooks/usePermission';
import * as DockerAPI from '@/api/admin/swarm/docker';
import type { DockerServiceObj } from '@/api/admin/swarm/type';
import TheDetail from './components/TheDetail';
import TheLogs from './components/TheLogs';

interface EnvPair {
  key: string;
  value: string;
}

interface PortMapping {
  Protocol: 'tcp' | 'udp';
  PublishedPort: number;
  TargetPort: number;
}

interface DockerFormFields {
  ID?: string;
  Name?: string;
  Image?: string;
  Replicas?: number;
  EnvPairs?: EnvPair[];
  PortMappings?: PortMapping[];
}

type DockerRow = DockerServiceObj & Record<string, unknown>;

interface DockerEnvPairsFieldProps {
  pairs: EnvPair[];
  disabled: boolean;
  t: (key: string) => string;
  setForm: Dispatch<SetStateAction<Partial<DockerRow>>>;
}

function DockerEnvPairsField({ pairs, disabled, t, setForm }: DockerEnvPairsFieldProps) {
  const updatePairs = (updater: (prev: EnvPair[]) => EnvPair[]) => {
    setForm((prev) => {
      const current = (prev as DockerFormFields).EnvPairs ?? [];
      return { ...prev, EnvPairs: updater(current) };
    });
  };

  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {t('swarm.docker.environment')}
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => updatePairs((prev) => [...prev, { key: '', value: '' }])}
          disabled={disabled}
          variant="outlined"
        >
          {t('swarm.docker.addEnv')}
        </Button>
      </Box>

      {pairs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
          {t('swarm.docker.noEnv')}
        </Typography>
      ) : (
        pairs.map((pair, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
            <TextField
              name={`EnvPairs.${index}.key`}
              size="small"
              label={t('swarm.docker.key')}
              placeholder={t('swarm.docker.keyPlaceholder')}
              value={pair.key}
              disabled={disabled}
              onChange={(e) =>
                updatePairs((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, key: e.target.value } : item)),
                )
              }
              sx={{ flex: 1 }}
            />
            <TextField
              name={`EnvPairs.${index}.value`}
              size="small"
              label={t('swarm.docker.value')}
              placeholder={t('swarm.docker.valuePlaceholder')}
              value={pair.value}
              disabled={disabled}
              onChange={(e) =>
                updatePairs((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, value: e.target.value } : item)),
                )
              }
              sx={{ flex: 2 }}
            />
            <IconButton
              color="error"
              size="small"
              disabled={disabled}
              onClick={() => updatePairs((prev) => prev.filter((_, i) => i !== index))}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ))
      )}
    </Box>
  );
}

interface DockerPortMappingsFieldProps {
  mappings: PortMapping[];
  disabled: boolean;
  t: (key: string) => string;
  setForm: Dispatch<SetStateAction<Partial<DockerRow>>>;
}

function DockerPortMappingsField({ mappings, disabled, t, setForm }: DockerPortMappingsFieldProps) {
  const updateMappings = (updater: (prev: PortMapping[]) => PortMapping[]) => {
    setForm((prev) => {
      const current = (prev as DockerFormFields).PortMappings ?? [];
      return { ...prev, PortMappings: updater(current) };
    });
  };

  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {t('swarm.docker.ports')}
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() =>
            updateMappings((prev) => [
              ...prev,
              { Protocol: 'tcp', PublishedPort: 80, TargetPort: 80 },
            ])
          }
          disabled={disabled}
          variant="outlined"
        >
          {t('swarm.docker.addPort')}
        </Button>
      </Box>

      {mappings.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
          {t('swarm.docker.noPorts')}
        </Typography>
      ) : (
        mappings.map((mapping, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
            <TextField
              name={`PortMappings.${index}.Protocol`}
              select
              size="small"
              label={t('swarm.docker.protocol')}
              value={mapping.Protocol}
              disabled={disabled}
              onChange={(e) =>
                updateMappings((prev) =>
                  prev.map((item, i) =>
                    i === index
                      ? { ...item, Protocol: e.target.value === 'udp' ? 'udp' : 'tcp' }
                      : item,
                  ),
                )
              }
              sx={{ width: 100 }}
            >
              <MenuItem value="tcp">TCP</MenuItem>
              <MenuItem value="udp">UDP</MenuItem>
            </TextField>
            <TextField
              name={`PortMappings.${index}.PublishedPort`}
              size="small"
              type="number"
              label={t('swarm.docker.pubPort')}
              placeholder={t('swarm.docker.pubPortPlaceholder')}
              value={mapping.PublishedPort || ''}
              disabled={disabled}
              onChange={(e) =>
                updateMappings((prev) =>
                  prev.map((item, i) =>
                    i === index
                      ? { ...item, PublishedPort: parseInt(e.target.value, 10) || 0 }
                      : item,
                  ),
                )
              }
              sx={{ flex: 1 }}
            />
            <TextField
              name={`PortMappings.${index}.TargetPort`}
              size="small"
              type="number"
              label={t('swarm.docker.targetPort')}
              placeholder={t('swarm.docker.targetPortPlaceholder')}
              value={mapping.TargetPort || ''}
              disabled={disabled}
              onChange={(e) =>
                updateMappings((prev) =>
                  prev.map((item, i) =>
                    i === index ? { ...item, TargetPort: parseInt(e.target.value, 10) || 0 } : item,
                  ),
                )
              }
              sx={{ flex: 1 }}
            />
            <IconButton
              color="error"
              size="small"
              disabled={disabled}
              onClick={() => updateMappings((prev) => prev.filter((_, i) => i !== index))}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ))
      )}
    </Box>
  );
}

function buildServiceSpec(form: DockerFormFields) {
  return {
    Name: form.Name || '',
    TaskTemplate: {
      ContainerSpec: {
        Image: form.Image || '',
        Env: (form.EnvPairs ?? []).map((p) => `${p.key}=${p.value}`),
      },
    },
    Mode: {
      Replicated: {
        Replicas: form.Replicas || 1,
      },
    },
    EndpointSpec: {
      Ports: (form.PortMappings ?? []).map((p) => ({
        Protocol: p.Protocol,
        PublishMode: 'ingress',
        PublishedPort: p.PublishedPort,
        TargetPort: p.TargetPort,
      })),
    },
  };
}

export default function DockerSwarmManagement() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<DockerServiceObj | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsRow, setLogsRow] = useState<DockerServiceObj | null>(null);

  const scaleService = async (
    row: DockerRow,
    replicas: number,
    refreshTable: () => void,
  ): Promise<void> => {
    try {
      const inspectRes = await DockerAPI.inspectServiceFn({ data: { id: row.ID } });
      const currentService = inspectRes.data?.data as unknown as DockerServiceObj | undefined;
      if (!currentService?.Spec) return;
      const version = currentService.Version?.Index || 0;
      const spec = {
        ...currentService.Spec,
        Name: currentService.Spec.Name || '',
        TaskTemplate: {
          ...currentService.Spec.TaskTemplate,
          ContainerSpec: {
            ...currentService.Spec.TaskTemplate?.ContainerSpec,
            Image: currentService.Spec.TaskTemplate?.ContainerSpec?.Image || '',
          },
        },
        Mode: {
          ...currentService.Spec.Mode,
          Replicated: {
            ...currentService.Spec.Mode?.Replicated,
            Replicas: replicas,
          },
        },
        EndpointSpec: currentService.Spec.EndpointSpec
          ? {
              ...currentService.Spec.EndpointSpec,
              Ports: currentService.Spec.EndpointSpec.Ports?.map((p) => ({
                ...p,
                PublishedPort: p.PublishedPort ?? 0,
                TargetPort: p.TargetPort ?? 0,
              })),
            }
          : undefined,
      };
      await DockerAPI.updateServiceFn({
        data: {
          id: row.ID,
          spec,
          version,
        },
      });
      refreshTable();
    } catch {
      // 全局 HTTP 拦截器统一展示错误
    }
  };

  const extensions: CrudExtensions<DockerRow> = {
    listAdapter: async (args) => {
      const keyword = typeof args.data?.keyword === 'string' ? args.data.keyword : '';
      const filters = keyword ? { name: [keyword] } : undefined;
      const res = await DockerAPI.listServicesFn({ data: { filters } });
      const list = (res.data?.data ?? []) as unknown as DockerRow[];
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
    mutationAdapter: {
      add: async ({ data }) => {
        const spec = buildServiceSpec(data as DockerFormFields);
        return await DockerAPI.createServiceFn({ data: { spec } });
      },
      update: async ({ data }) => {
        const form = data as DockerFormFields;
        const serviceId = String(form.ID || '');
        const inspectRes = await DockerAPI.inspectServiceFn({ data: { id: serviceId } });
        const version =
          (inspectRes.data?.data as unknown as { Version?: { Index?: number } })?.Version?.Index ||
          0;
        const spec = buildServiceSpec(form);
        return await DockerAPI.updateServiceFn({
          data: {
            id: serviceId,
            spec,
            version,
          },
        });
      },
      delete: async ({ data }) =>
        await DockerAPI.removeServiceFn({ data: { id: String(data.id) } }),
    },
    afterOpen: (form, isEdit, row) => {
      if (!isEdit || !row) return form;
      const containerSpec = row.Spec?.TaskTemplate?.ContainerSpec || {};
      const rawEnv = containerSpec.Env ?? [];
      const envPairs: EnvPair[] = rawEnv.map((item) => {
        const idx = item.indexOf('=');
        return idx !== -1
          ? { key: item.substring(0, idx), value: item.substring(idx + 1) }
          : { key: item, value: '' };
      });
      const portMappings: PortMapping[] = (row.Spec?.EndpointSpec?.Ports ?? []).map((p) => ({
        Protocol: p.Protocol || 'tcp',
        PublishedPort: p.PublishedPort || 0,
        TargetPort: p.TargetPort || 0,
      }));
      return {
        ID: row.ID,
        Name: row.Spec?.Name || '',
        Image: containerSpec.Image || '',
        Replicas: row.Spec?.Mode?.Replicated?.Replicas || 1,
        EnvPairs: envPairs,
        PortMappings: portMappings,
      } as Partial<DockerRow>;
    },
    customCells: {
      ID: (row) => (row.ID ? row.ID.substring(0, 12) : '-'),
    },
    customCardFields: (t) => [
      { type: 'title', label: t('swarm.docker.name'), render: (row) => row.Spec?.Name || '-' },
      {
        type: 'content',
        label: t('swarm.docker.image'),
        render: (row) => row.Spec?.TaskTemplate?.ContainerSpec?.Image || '-',
      },
      {
        type: 'content',
        label: t('swarm.docker.replicas'),
        render: (row) => row.Spec?.Mode?.Replicated?.Replicas ?? t('swarm.docker.globalMode'),
      },
    ],
    customFormFields: {
      EnvPairs: (ctx) => (
        <DockerEnvPairsField
          pairs={(ctx.form as DockerFormFields).EnvPairs ?? []}
          disabled={ctx.disabled}
          t={ctx.t}
          setForm={ctx.setForm}
        />
      ),
      PortMappings: (ctx) => (
        <DockerPortMappingsField
          mappings={(ctx.form as DockerFormFields).PortMappings ?? []}
          disabled={ctx.disabled}
          t={ctx.t}
          setForm={ctx.setForm}
        />
      ),
    },
    rowActions: (t) => [
      {
        key: 'inspect',
        color: 'info',
        icon: <ViewIcon />,
        permissionCodes: [permissions.admin.swarm.docker.read],
        onClick: (row) => {
          setDetailRow(row);
          setDetailOpen(true);
        },
      },
      {
        key: 'logs',
        color: 'secondary',
        icon: <LogIcon />,
        permissionCodes: [permissions.admin.swarm.docker.read],
        onClick: (row) => {
          setLogsRow(row);
          setLogsOpen(true);
        },
      },
      {
        key: 'pause',
        color: 'warning',
        icon: (
          <Tooltip title={t('swarm.docker.pause')}>
            <PauseIcon />
          </Tooltip>
        ),
        permissionCodes: [permissions.admin.swarm.docker.edit],
        visible: (row) =>
          !!row.Spec?.Mode?.Replicated && (row.Spec?.Mode?.Replicated?.Replicas ?? 0) > 0,
        onClick: (row, helpers) => void scaleService(row, 0, helpers.refreshTable),
      },
      {
        key: 'play',
        color: 'success',
        icon: (
          <Tooltip title={t('swarm.docker.play')}>
            <PlayIcon />
          </Tooltip>
        ),
        permissionCodes: [permissions.admin.swarm.docker.edit],
        visible: (row) =>
          !!row.Spec?.Mode?.Replicated && (row.Spec?.Mode?.Replicated?.Replicas ?? 0) === 0,
        onClick: (row, helpers) => void scaleService(row, 1, helpers.refreshTable),
      },
    ],
    dialogs: () => (
      <>
        <TheDetail
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setDetailRow(null);
          }}
          service={detailRow}
        />
        <TheLogs
          open={logsOpen}
          serviceId={logsRow?.ID || null}
          serviceName={logsRow?.Spec?.Name || null}
          onClose={() => {
            setLogsOpen(false);
            setLogsRow(null);
          }}
        />
      </>
    ),
  };

  return <ContractCrudPage contract={adminSwarmDockerContract} extensions={extensions} />;
}
