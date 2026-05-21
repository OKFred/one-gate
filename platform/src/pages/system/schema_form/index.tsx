import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheForm, { type TheFormRef } from './components/TheForm';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import ThePreviewDialog, { type ThePreviewDialogRef } from './components/ThePreviewDialog';
import { TheActionButtons } from './components/TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  formRef: React.RefObject<TheFormRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
  previewRef: React.RefObject<ThePreviewDialogRef | null>;
}

export interface Props {
  localObj: LocalObj;
}

export default function ThePage() {
  const t = useTranslation();
  const tableRef = useRef<TheTableRef>(null);
  const formRef = useRef<TheFormRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const previewRef = useRef<ThePreviewDialogRef>(null);

  const localObj: LocalObj = useMemo(() => ({ tableRef, formRef, filterRef, previewRef }), []);

  return (
    <PageLayout title={t('schemaForm.title')} actions={<TheActionButtons formRef={formRef} />}>
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <ThePreviewDialog ref={localObj.previewRef} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
