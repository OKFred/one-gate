import { THIS_PERMISSION } from './constant';
import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AccountRes, type TableExtraContext } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as AccountAPI from '@/api/admin/mail/account';
import * as ActionAPI from '@/api/admin/mail/action';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListMailAccountReq } from '@/api/admin/mail/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export default function MailAccountPage() {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const t = useTranslation();

  // 处理发信连接测试
  const handleVerify = async (accountId: number) => {
    try {
      setVerifyingId(accountId);
      await ActionAPI.verifyFn({ data: { accountId } });
      showSnackbar({ message: t('account.verifySuccess'), type: 'success' });
    } catch {
    } finally {
      setVerifyingId(null);
    }
  };

  const extraContext: TableExtraContext = {
    verifyingId,
    handleVerify,
  };

  const config: SchemaCrudConfig<AccountRes, FilterState, ListMailAccountReq, TableExtraContext> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: AccountAPI.listFn,
      add: AccountAPI.addFn,
      update: AccountAPI.updateFn,
      delete: AccountAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
          orderBy: filters.orderBy,
          descend: filters.descend,
        }) as ListMailAccountReq,
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
