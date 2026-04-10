import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheTable, { type CacheTableRef } from './components/TheTable';
import TheFilter, { type CacheFilterRef } from './components/TheFilter';
import TheDetail, { type TheDetailRef } from './components/TheDetail';
import { TheActionButtons } from './components/TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

export interface Props {
  localObj: LocalObj;
}

export interface LocalObj {
  tableRef: React.RefObject<CacheTableRef | null>;
  detailRef: React.RefObject<TheDetailRef | null>;
  filterRef: React.RefObject<CacheFilterRef | null>;
}

export default function CacheManagementPage() {
  const t = useTranslation();
  const tableRef = useRef<CacheTableRef>(null);
  const detailRef = useRef<TheDetailRef>(null);
  const filterRef = useRef<CacheFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, detailRef, filterRef }), []);

  return (
    <PageLayout title={t('cache.title')} actions={<TheActionButtons tableRef={tableRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
      <TheDetail ref={localObj.detailRef} localObj={localObj} />
    </PageLayout>
  );
}
