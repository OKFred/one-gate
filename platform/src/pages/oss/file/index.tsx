import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type FileRes } from './components/TheTable';
import TheUploadDialog from './components/TheUploadDialog';
import { ResponsiveButton } from '@/components/Responsive';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import * as OSSFileAPI from '@/api/oss/file';
import type { ListFileReq } from '@/api/oss/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export default function OSSFilePage() {
  const t = useTranslation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // 通过底座 customActions 选配渲染顶部的自定义按钮
  const customActions = (
    <ResponsiveButton
      variant="contained"
      color="primary"
      startIcon={<UploadIcon />}
      onClick={() => setUploadOpen(true)}
    >
      {t('oss.file.upload')}
    </ResponsiveButton>
  );

  const config: SchemaCrudConfig<FileRes, FilterState, ListFileReq> = {
    titleKey: 'oss.file.title',
    apiKeyName: 'key',
    cursorPagination: true,
    permissions: {},
    api: {
      list: OSSFileAPI.listFn,
      delete: (
        args: Parameters<
          NonNullable<SchemaCrudConfig<FileRes, FilterState, ListFileReq>['api']['delete']>
        >[0],
      ) => OSSFileAPI.deleteFn({ data: { key: String(args.data.id) } }),
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListFileReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
      actions: tableConfig.actions,
    },
    form: {
      schema: { type: 'object', properties: {} },
      defaultForm: {},
    },
  };

  return (
    <>
      <SchemaCrudPage key={refreshKey} config={config} customActions={customActions} />
      <TheUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
