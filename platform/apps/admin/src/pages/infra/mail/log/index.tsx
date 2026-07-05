import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type LogRes, type TableExtraContext } from './components/TheTable';
import TheDetail from './components/TheDetail';
import * as mailLogAPI from '@/api/infra/mail/log';
import type { ListMailLogReq } from '@/api/infra/mail/type';
import type { SchemaCrudConfig } from '@/components/Crud';

// 纯只读列表无需配置表单和 Schema 校验
const emptySchema = { type: 'object', properties: {} };

export default function MailLogPage() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<LogRes | null>(null);

  const openDetail = (row: LogRes) => {
    setDetailData(row);
    setDetailOpen(true);
  };

  const extraContext: TableExtraContext = {
    openDetail,
  };

  const config: SchemaCrudConfig<LogRes, FilterState, ListMailLogReq, TableExtraContext> = {
    apiKeyName: 'id',
    api: {
      list: mailLogAPI.listFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
          orderBy: filters.orderBy,
          descend: filters.descend,
        }) as ListMailLogReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
      actions: tableConfig.actions,
    },
    form: {
      schema: emptySchema,
      defaultForm: {},
    },
  };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />
      <TheDetail open={detailOpen} onClose={() => setDetailOpen(false)} log={detailData} />
    </>
  );
}
