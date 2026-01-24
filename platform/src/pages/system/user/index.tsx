import { useRef, useMemo, useState, useEffect } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheForm, { type TheFormRef } from './components/TheForm';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import { TheActionButtons } from './components/TheActionButtons';
import * as RegionAPI from '@/api/i18n/region';
import type { ListAllRegionRes } from '@/api/i18n/type';

export interface Props {
  localObj: LocalObj;
}
export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  formRef: React.RefObject<TheFormRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
  enabledRegions: ListAllRegionRes;
}

export default function UserManagement() {
  const t = useTranslation();
  const tableRef = useRef<TheTableRef>(null);
  const formRef = useRef<TheFormRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const [enabledRegions, setEnabledRegions] = useState<ListAllRegionRes>([]);
  
  const localObj: LocalObj = useMemo(
    () => ({ tableRef, formRef, filterRef, enabledRegions }),
    [enabledRegions]
  );

  // 获取启用的地区列表
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await RegionAPI.listAllFn({ data: { isEnabled: true } });
        setEnabledRegions(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch regions:', error);
      }
    };
    fetchRegions();
  }, []);

  return (
    <PageLayout title={t('system.user.title')} actions={<TheActionButtons formRef={formRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
