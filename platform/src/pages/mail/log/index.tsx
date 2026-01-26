import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import TheDetail, { type TheDetailRef } from './components/TheDetail';
import { TheActionButtons } from './components/TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

export interface Props {
  localObj: LocalObj;
}
export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
  detailRef: React.RefObject<TheDetailRef | null>;
}

export default function MailLogPage() {
  const tableRef = useRef<TheTableRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const detailRef = useRef<TheDetailRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, filterRef, detailRef }), []);
  const t = useTranslation();

  return (
    <PageLayout title={t('log.title')} actions={<TheActionButtons tableRef={tableRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
      <TheDetail ref={localObj.detailRef} localObj={localObj} />
    </PageLayout>
  );
}
