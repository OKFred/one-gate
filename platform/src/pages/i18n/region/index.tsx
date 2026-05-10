import { useRef, useMemo, useState, useEffect } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheForm, { type TheFormRef } from './components/TheForm';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import { TheActionButtons } from './components/TheActionButtons';
import * as LanguageAPI from '@/api/i18n/language';
import type { ListAllLanguageRes } from '@/api/i18n/type';

export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  formRef: React.RefObject<TheFormRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
  enabledLanguages: ListAllLanguageRes;
}

export interface Props {
  localObj: LocalObj;
  enabledLanguages?: ListAllLanguageRes; // TheFilter 不需要，所以可选
}

export default function ThePage() {
  const t = useTranslation();
  const tableRef = useRef<TheTableRef>(null);
  const formRef = useRef<TheFormRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const [enabledLanguages, setEnabledLanguages] = useState<ListAllLanguageRes>([]);

  const localObj: LocalObj = useMemo(
    () => ({ tableRef, formRef, filterRef, enabledLanguages }),
    [enabledLanguages],
  );

  // 获取启用的语言列表
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await LanguageAPI.listAllFn({ data: { isEnabled: true } });
        setEnabledLanguages(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch languages:', error);
      }
    };
    fetchLanguages();
  }, []);

  return (
    <PageLayout title={t('region.title')} actions={<TheActionButtons formRef={formRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
