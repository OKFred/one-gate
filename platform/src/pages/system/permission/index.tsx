import { useRef, useMemo, useState, useEffect } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheForm, { type TheFormRef } from './components/TheForm';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import { TheActionButtons } from './components/TheActionButtons';
import * as PermissionAPI from '@/api/system/permission';
import type { ListAllPermissionRes } from '@/api/system/type';

export interface Props {
  localObj: LocalObj;
}
export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  formRef: React.RefObject<TheFormRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
  allPermissions: ListAllPermissionRes;
}

export default function PermissionManagement() {
  const t = useTranslation();
  const tableRef = useRef<TheTableRef>(null);
  const formRef = useRef<TheFormRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const [allPermissions, setAllPermissions] = useState<ListAllPermissionRes>([]);

  const localObj: LocalObj = useMemo(
    () => ({ tableRef, formRef, filterRef, allPermissions }),
    [allPermissions],
  );

  // 获取所有权限列表
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await PermissionAPI.listAllFn({ data: {} });
        setAllPermissions(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      }
    };
    fetchPermissions();
  }, []);

  return (
    <PageLayout title={t('permission.title')} actions={<TheActionButtons formRef={formRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
