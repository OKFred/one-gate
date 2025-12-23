import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import AccountForm, { type AccountFormRef } from './components/AccountForm';
import AccountTable, { type AccountTableRef } from './components/AccountTable';
import AccountFilter, { type AccountFilterRef } from './components/AccountFilter';
import { AddAccountButton } from './components/AccountButtons';

export interface LocalObj {
  tableRef: React.RefObject<AccountTableRef | null>;
  formRef: React.RefObject<AccountFormRef | null>;
  filterRef: React.RefObject<AccountFilterRef | null>;
}

export default function MailAccountPage() {
  const tableRef = useRef<AccountTableRef>(null);
  const formRef = useRef<AccountFormRef>(null);
  const filterRef = useRef<AccountFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef }), []);

  return (
    <PageLayout
      title="邮件账户管理"
      actions={<AddAccountButton formRef={formRef} />}
    >
      <AccountFilter ref={localObj.filterRef} localObj={localObj} />
      <AccountForm ref={localObj.formRef} localObj={localObj} />
      <AccountTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
