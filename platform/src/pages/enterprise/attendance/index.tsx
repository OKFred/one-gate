import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheForm, { type TheFormRef } from './components/TheForm';
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
  formRef: React.RefObject<TheFormRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
  detailRef: React.RefObject<TheDetailRef | null>;
}

export default function AttendancePage() {
  const tableRef = useRef<TheTableRef>(null);
  const formRef = useRef<TheFormRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const detailRef = useRef<TheDetailRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef, detailRef }), []);
  const t = useTranslation();

  return (
    <PageLayout
      title={t('enterprise.attendance.title')}
      actions={<TheActionButtons formRef={formRef} />}
    >
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <TheDetail ref={localObj.detailRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
