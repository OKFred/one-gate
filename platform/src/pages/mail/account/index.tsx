import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheForm, { type TheFormRef } from './components/TheForm';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import { AddTheButton } from './components/TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  formRef: React.RefObject<TheFormRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
}

export default function MailAccountPage() {
  const tableRef = useRef<TheTableRef>(null);
  const formRef = useRef<TheFormRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef }), []);
  const t = useTranslation();

  return (
    <PageLayout title={t("i18n.pages.mail.account.title")} actions={<AddTheButton formRef={formRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
