import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AccountRes, type TableExtraContext } from './components/TheTable';
import AccountFormFields from './components/TheForm';
import schema from '@/assets/schemas/mail.accountAddReq.json';
import * as AccountAPI from '@/api/mail/account';
import * as ActionAPI from '@/api/mail/action';
import { MAIL } from '@/hooks/usePermission';
import { showSnackbar } from '@/components/Notification';
import type { AddMailAccountReq, ListMailAccountReq } from '@/api/mail/type';
import type { SchemaCrudConfig } from '@/components/Crud';

const DEFAULT_FORM: Partial<AccountRes> = {
  nickname: '',
  mailAddress: '',
  host: '',
  port: 465,
  password: '',
  isEnabled: true,
  remark: null,
};

export default function MailAccountPage() {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  // 处理发信连接测试
  const handleVerify = async (accountId: number) => {
    try {
      setVerifyingId(accountId);
      await ActionAPI.verifyFn({ data: { accountId } });
      showSnackbar({ message: '验证成功', type: 'success' });
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setVerifyingId(null);
    }
  };

  const extraContext: TableExtraContext = {
    verifyingId,
    handleVerify,
  };

  const config: SchemaCrudConfig<AccountRes, FilterState, ListMailAccountReq, TableExtraContext> = {
    titleKey: 'account.title',
    apiKeyName: 'id',
    permissions: {
      add: [MAIL.ACCOUNT.ADD],
      edit: [MAIL.ACCOUNT.EDIT],
      delete: [MAIL.ACCOUNT.DELETE],
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
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      beforeSubmit: (form) => {
        // 对输入密码进行 Base64 编码以整合原有安全业务规则
        const base64Password = form.password ? globalThis.btoa(form.password) : '';
        return {
          ...form,
          password: base64Password,
        };
      },
      renderForm: (form, setForm, isMobile, t) => (
        <AccountFormFields
          form={form as Partial<AddMailAccountReq>}
          setForm={setForm as React.Dispatch<React.SetStateAction<Partial<AddMailAccountReq>>>}
          isMobile={isMobile}
          t={t}
        />
      ),
    },
  };

  return <SchemaCrudPage config={config} extraContext={extraContext} />;
}
