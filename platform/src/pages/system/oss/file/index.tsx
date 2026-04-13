import { useRef, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import TheUploadDialog, { type TheUploadDialogRef } from './components/TheUploadDialog';
import TheTable, { type TheTableRef } from './components/TheTable';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import { TheActionButtons } from './components/TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

export interface Props {
  localObj: LocalObj;
}
export interface LocalObj {
  tableRef: React.RefObject<TheTableRef | null>;
  uploadDialogRef: React.RefObject<TheUploadDialogRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
}

export default function OSSFilePage() {
  const tableRef = useRef<TheTableRef>(null);
  const uploadDialogRef = useRef<TheUploadDialogRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ tableRef, uploadDialogRef, filterRef }), []);
  const t = useTranslation();

  return (
    <PageLayout
      title={t('oss.file.title')}
      actions={<TheActionButtons uploadDialogRef={uploadDialogRef} />}
    >
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheUploadDialog ref={localObj.uploadDialogRef} localObj={localObj} />
      <TheTable ref={localObj.tableRef} localObj={localObj} />
    </PageLayout>
  );
}
