import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import RoleForm, { type RoleFormRef } from './components/RoleForm';
import RoleTable, { type RoleTableRef } from './components/RoleTable';
import RoleFilter, { type RoleFilterRef } from './components/RoleFilter';

export interface LocalObj {
  tableRef: React.RefObject<RoleTableRef | null>;
  formRef: React.RefObject<RoleFormRef | null>;
  filterRef: React.RefObject<RoleFilterRef | null>;
}

export default function RoleManagementPage() {
  const tableRef = useRef<RoleTableRef>(null);
  const formRef = useRef<RoleFormRef>(null);
  const filterRef = useRef<RoleFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef }), []);

  return (
    <PageLayout title="角色管理">
      <RoleFilter ref={localObj.filterRef} localObj={localObj} />
      <RoleForm ref={localObj.formRef} localObj={localObj} />
      <RoleTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
