import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import { TheActionButtons } from './components/TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

export interface Props {
  localObj: LocalObj;
}

export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
}

export default function AuditLoginPage() {
  const t = useTranslation();
  const tableRef = useRef<TheTableRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, filterRef }), []);

  return (
    <PageLayout 
      title={t('maintenance.auditLogin.title')} 
      actions={<TheActionButtons tableRef={tableRef} />}
    >
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
