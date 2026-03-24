import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheForm, { type CacheFormRef } from './components/TheForm';
import TheTable, { type CacheTableRef } from './components/TheTable';
import TheFilter, { type CacheFilterRef } from './components/TheFilter';
import { TheActionButtons } from './components/TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

export interface Props {
  localObj: LocalObj;
}

export interface LocalObj {
  tableRef: React.RefObject<CacheTableRef | null>;
  formRef: React.RefObject<CacheFormRef | null>;
  filterRef: React.RefObject<CacheFilterRef | null>;
}

export default function CacheManagementPage() {
  const t = useTranslation();
  const tableRef = useRef<CacheTableRef>(null);
  const formRef = useRef<CacheFormRef>(null);
  const filterRef = useRef<CacheFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef }), []);

  return (
    <PageLayout title={t('cache.title')} actions={<TheActionButtons formRef={formRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
