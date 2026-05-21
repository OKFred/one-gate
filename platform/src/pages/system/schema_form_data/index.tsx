import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import TheDetailsDialog, { type TheDetailsDialogRef } from './components/TheDetailsDialog';
import { useTranslation } from '@/hooks/useTranslation';

export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
  detailsRef: React.RefObject<TheDetailsDialogRef | null>;
}

export interface Props {
  localObj: LocalObj;
}

export default function ThePage() {
  const t = useTranslation();
  const tableRef = useRef<TheTableRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const detailsRef = useRef<TheDetailsDialogRef>(null);

  const localObj: LocalObj = useMemo(() => ({ tableRef, filterRef, detailsRef }), []);

  return (
    <PageLayout title={t('schemaFormData.title')}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheDetailsDialog ref={localObj.detailsRef} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
