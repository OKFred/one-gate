import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheForm, { type RoleFormRef } from './components/TheForm';
import TheTable, { type RoleTableRef } from './components/TheTable';
import TheFilter, { type RoleFilterRef } from './components/TheFilter';
import { TheActionButtons } from './components/TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

export interface Props {
  localObj: LocalObj;
}
export interface LocalObj {
  tableRef: React.RefObject<RoleTableRef | null>;
  formRef: React.RefObject<RoleFormRef | null>;
  filterRef: React.RefObject<RoleFilterRef | null>;
}

export default function RoleManagementPage() {
  const t = useTranslation();
  const tableRef = useRef<RoleTableRef>(null);
  const formRef = useRef<RoleFormRef>(null);
  const filterRef = useRef<RoleFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef }), []);

  return (
    <PageLayout title={t('role.title')} actions={<TheActionButtons formRef={formRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
