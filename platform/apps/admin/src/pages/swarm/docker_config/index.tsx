import { THIS_PERMISSION } from './constant';
import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import {
  tableConfig,
  type SwarmDockerConfigRes,
  type TableExtraContext,
} from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as DockerConfigAPI from '@/api/admin/swarm/docker_config';
import type {
  ListDockerConfigReq,
  AddDockerConfigReq,
  UpdateDockerConfigReq,
} from '@/api/admin/swarm/type';
import { showSnackbar } from '@/components/Notification';
import type { SchemaCrudConfig } from '@/components/Crud';
import { useTranslation } from '@/hooks/useTranslation';

export default function SwarmDockerConfigPage() {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const t = useTranslation();

  // 处理 Docker 连通性测试
  const handleVerify = async (id: number) => {
    try {
      setVerifyingId(id);
      await DockerConfigAPI.verifyFn({ data: { id } });
      showSnackbar({ message: t('swarm.docker_config.verifySuccess'), type: 'success' });
    } finally {
      setVerifyingId(null);
    }
  };

  const extraContext: TableExtraContext = {
    verifyingId,
    handleVerify,
  };

  const config: SchemaCrudConfig<
    SwarmDockerConfigRes,
    FilterState,
    ListDockerConfigReq,
    TableExtraContext
  > = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: DockerConfigAPI.listFn as unknown as SchemaCrudConfig<
        SwarmDockerConfigRes,
        FilterState,
        ListDockerConfigReq
      >['api']['list'],
      add: DockerConfigAPI.addFn as unknown as SchemaCrudConfig<
        SwarmDockerConfigRes,
        FilterState,
        AddDockerConfigReq
      >['api']['add'],
      update: DockerConfigAPI.updateFn as unknown as SchemaCrudConfig<
        SwarmDockerConfigRes,
        FilterState,
        UpdateDockerConfigReq
      >['api']['update'],
      delete: DockerConfigAPI.deleteFn as unknown as SchemaCrudConfig<
        SwarmDockerConfigRes,
        FilterState,
        unknown
      >['api']['delete'],
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListDockerConfigReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
      actions: tableConfig.actions,
    },
    form: formConfig,
  };

  return <SchemaCrudPage config={config} extraContext={extraContext} />;
}
