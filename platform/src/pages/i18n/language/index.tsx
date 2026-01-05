import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import LanguageForm, { type LanguageFormRef } from './components/LanguageForm';
import LanguageTable, { type LanguageTableRef } from './components/LanguageTable';
import LanguageFilter, { type LanguageFilterRef } from './components/LanguageFilter';

export interface LocalObj {
  tableRef: React.RefObject<LanguageTableRef | null>;
  formRef: React.RefObject<LanguageFormRef | null>;
  filterRef: React.RefObject<LanguageFilterRef | null>;
}

export default function LanguageManagementPage() {
  const tableRef = useRef<LanguageTableRef>(null);
  const formRef = useRef<LanguageFormRef>(null);
  const filterRef = useRef<LanguageFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef }), []);

  return (
    <PageLayout title="多语言管理">
      <LanguageFilter ref={localObj.filterRef} localObj={localObj} />
      <LanguageForm ref={localObj.formRef} localObj={localObj} />
      <LanguageTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
