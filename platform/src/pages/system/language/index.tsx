import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import I18nForm, { type I18nFormRef } from './components/I18nForm';
import I18nTable, { type I18nTableRef } from './components/I18nTable';
import I18nFilter, { type I18nFilterRef } from './components/I18nFilter';

export interface LocalObj {
  tableRef: React.RefObject<I18nTableRef | null>;
  formRef: React.RefObject<I18nFormRef | null>;
  filterRef: React.RefObject<I18nFilterRef | null>;
}

export default function LanguageManagementPage() {
  const tableRef = useRef<I18nTableRef>(null);
  const formRef = useRef<I18nFormRef>(null);
  const filterRef = useRef<I18nFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef }), []);

  return (
    <PageLayout title="多语言管理">
      <I18nFilter ref={localObj.filterRef} localObj={localObj} />
      <I18nForm ref={localObj.formRef} localObj={localObj} />
      <I18nTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
