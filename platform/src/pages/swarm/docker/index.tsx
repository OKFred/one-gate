import React, { useState, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import {
  Visibility as ViewIcon,
  Article as LogIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import * as DockerAPI from '@/api/swarm/docker';
import { SWARM } from '@/hooks/usePermission';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { DockerServiceObj } from '@/api/swarm/type';
import TheForm, { type SwarmFormState, type EnvPair, type PortMapping } from './components/TheForm';
import TheDetail from './components/TheDetail';
import TheLogs from './components/TheLogs';

interface DockerContext {
  onInspect: (row: DockerServiceObj) => void;
  onLogs: (row: DockerServiceObj) => void;
}

export default function DockerSwarmManagement() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<DockerServiceObj | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsRow, setLogsRow] = useState<DockerServiceObj | null>(null);

  const extraContext = useMemo<DockerContext>(
    () => ({
      onInspect: (row) => {
        setDetailRow(row);
        setDetailOpen(true);
      },
      onLogs: (row) => {
        setLogsRow(row);
        setLogsOpen(true);
      },
    }),
    [],
  );

  const config: SchemaCrudConfig<
    DockerServiceObj,
    { keyword: string },
    { keyword?: string },
    DockerContext
  > = {
    titleKey: 'swarm.docker.title',
    apiKeyName: 'ID',
    permissions: {
      add: [SWARM.DOCKER.ADD],
      edit: [SWARM.DOCKER.EDIT],
      delete: [SWARM.DOCKER.DELETE],
    },
    api: {
      list: async (args) => {
        const keyword = args.data?.keyword || '';
        const filters = keyword ? { name: [keyword] } : undefined;
        const res = await DockerAPI.listServicesFn({ data: { filters } });
        const list = (res.data?.data || []) as unknown as DockerServiceObj[];
        return {
          data: {
            data: {
              list,
              total: list.length,
            },
          },
        };
      },
      add: async ({ data: rawForm }: { data: unknown }) => {
        const form = rawForm as SwarmFormState;
        const spec = {
          Name: form.Name,
          TaskTemplate: {
            ContainerSpec: {
              Image: form.Image,
              Env: form.EnvPairs?.map((p: EnvPair) => `${p.key}=${p.value}`) || [],
            },
          },
          Mode: {
            Replicated: {
              Replicas: form.Replicas || 1,
            },
          },
          EndpointSpec: {
            Ports:
              form.PortMappings?.map((p: PortMapping) => ({
                Protocol: p.Protocol,
                PublishMode: 'ingress',
                PublishedPort: p.PublishedPort,
                TargetPort: p.TargetPort,
              })) || [],
          },
        };
        return await DockerAPI.createServiceFn({
          data: {
            spec: spec as unknown as NonNullable<
              NonNullable<Parameters<typeof DockerAPI.createServiceFn>[0]>['data']
            >['spec'],
          },
        });
      },
      update: async ({ data: rawForm }: { data: unknown }) => {
        const form = rawForm as SwarmFormState & { id: string };
        // 1. Fetch latest version index first to prevent write collisions
        const inspectRes = await DockerAPI.inspectServiceFn({ data: { id: form.id } });
        const version =
          (inspectRes.data?.data as unknown as { Version?: { Index?: number } })?.Version?.Index ||
          0;

        // 2. Map form to update spec
        const spec = {
          Name: form.Name,
          TaskTemplate: {
            ContainerSpec: {
              Image: form.Image,
              Env: form.EnvPairs?.map((p: EnvPair) => `${p.key}=${p.value}`) || [],
            },
          },
          Mode: {
            Replicated: {
              Replicas: form.Replicas || 1,
            },
          },
          EndpointSpec: {
            Ports:
              form.PortMappings?.map((p: PortMapping) => ({
                Protocol: p.Protocol,
                PublishMode: 'ingress',
                PublishedPort: p.PublishedPort,
                TargetPort: p.TargetPort,
              })) || [],
          },
        };

        return await DockerAPI.updateServiceFn({
          data: {
            id: form.id,
            spec: spec as unknown as NonNullable<
              NonNullable<Parameters<typeof DockerAPI.updateServiceFn>[0]>['data']
            >['spec'],
            version,
          },
        });
      },
      delete: async ({ data }: { data: { id: number } }) => {
        return await DockerAPI.removeServiceFn({ data: { id: String(data.id) } });
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
        { title: t('swarm.docker.id'), render: (row) => row.ID.substring(0, 12) },
        { title: t('swarm.docker.name'), render: (row) => row.Spec?.Name || '-' },
        {
          title: t('swarm.docker.image'),
          render: (row) => row.Spec?.TaskTemplate?.ContainerSpec?.Image || '-',
        },
        {
          title: t('swarm.docker.replicas'),
          render: (row) => row.Spec?.Mode?.Replicated?.Replicas ?? t('swarm.docker.globalMode'),
        },
        {
          title: t('swarm.docker.createdAt'),
          render: (row) => (row.CreatedAt ? new Date(row.CreatedAt).toLocaleString() : '-'),
        },
      ],
      cardFields: (t) => [
        { label: t('swarm.docker.name'), render: (row) => row.Spec?.Name || '-' },
        {
          label: t('swarm.docker.image'),
          render: (row) => row.Spec?.TaskTemplate?.ContainerSpec?.Image || '-',
        },
        {
          label: t('swarm.docker.replicas'),
          render: (row) => row.Spec?.Mode?.Replicated?.Replicas ?? t('swarm.docker.globalMode'),
        },
      ],
      actions: (t, context) => [
        {
          key: 'inspect',
          color: 'info',
          icon: <ViewIcon />,
          permissionCodes: [SWARM.DOCKER.READ],
          onClick: (row) => {
            context?.onInspect(row);
          },
        },
        {
          key: 'logs',
          color: 'secondary',
          icon: <LogIcon />,
          permissionCodes: [SWARM.DOCKER.READ],
          onClick: (row) => {
            context?.onLogs(row);
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
          permissionCodes: [SWARM.DOCKER.EDIT],
          visible: (row) =>
            !!row.Spec?.Mode?.Replicated && (row.Spec?.Mode?.Replicated?.Replicas ?? 0) > 0,
          onClick: async (row, helpers) => {
            try {
              const inspectRes = await DockerAPI.inspectServiceFn({ data: { id: row.ID } });
              const currentService = inspectRes.data?.data as unknown as DockerServiceObj;
              if (!currentService || !currentService.Spec) {
                throw new Error('Failed to inspect service');
              }
              const version = currentService.Version?.Index || 0;
              const spec = currentService.Spec;
              if (spec.Mode?.Replicated) {
                spec.Mode.Replicated.Replicas = 0;
              }
              await DockerAPI.updateServiceFn({
                data: {
                  id: row.ID,
                  spec: spec as any,
                  version,
                },
              });
              helpers.refreshTable();
            } catch (err) {
              console.error('Failed to pause service:', err);
            }
          },
        },
        {
          key: 'play',
          color: 'success',
          icon: (
            <Tooltip title={t('swarm.docker.play')}>
              <PlayIcon />
            </Tooltip>
          ),
          permissionCodes: [SWARM.DOCKER.EDIT],
          visible: (row) =>
            !!row.Spec?.Mode?.Replicated && (row.Spec?.Mode?.Replicated?.Replicas ?? 0) === 0,
          onClick: async (row, helpers) => {
            try {
              const inspectRes = await DockerAPI.inspectServiceFn({ data: { id: row.ID } });
              const currentService = inspectRes.data?.data as unknown as DockerServiceObj;
              if (!currentService || !currentService.Spec) {
                throw new Error('Failed to inspect service');
              }
              const version = currentService.Version?.Index || 0;
              const spec = currentService.Spec;
              if (spec.Mode?.Replicated) {
                spec.Mode.Replicated.Replicas = 1;
              }
              await DockerAPI.updateServiceFn({
                data: {
                  id: row.ID,
                  spec: spec as any,
                  version,
                },
              });
              helpers.refreshTable();
            } catch (err) {
              console.error('Failed to play service:', err);
            }
          },
        },
      ],
    },
    form: {
      schema: { type: 'object' },
      defaultForm: {
        Name: '',
        Image: '',
        Replicas: 1,
        EnvPairs: [],
        PortMappings: [],
      } as unknown as Partial<DockerServiceObj>,
      afterOpen: (form, isEdit) => {
        if (isEdit && form) {
          const serviceRow = form as unknown as DockerServiceObj;
          const containerSpec = serviceRow.Spec?.TaskTemplate?.ContainerSpec || {};
          const rawEnv: string[] = containerSpec.Env || [];
          const EnvPairs: EnvPair[] = rawEnv.map((item) => {
            const index = item.indexOf('=');
            if (index !== -1) {
              return { key: item.substring(0, index), value: item.substring(index + 1) };
            }
            return { key: item, value: '' };
          });

          const rawPorts = serviceRow.Spec?.EndpointSpec?.Ports || [];
          const PortMappings: PortMapping[] = rawPorts.map((p) => ({
            Protocol: p.Protocol || 'tcp',
            PublishedPort: p.PublishedPort || 0,
            TargetPort: p.TargetPort || 0,
          }));

          return {
            id: serviceRow.ID,
            Name: serviceRow.Spec?.Name || '',
            Image: containerSpec.Image || '',
            Replicas: serviceRow.Spec?.Mode?.Replicated?.Replicas || 1,
            EnvPairs,
            PortMappings,
          } as unknown as Partial<DockerServiceObj>;
        }
        return form;
      },
      renderForm: (form, setForm, _isMobile, t) => (
        <TheForm
          form={form as unknown as Partial<SwarmFormState>}
          setForm={
            setForm as unknown as React.Dispatch<React.SetStateAction<Partial<SwarmFormState>>>
          }
          t={t}
        />
      ),
    },
  };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />

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
  );
}
