import { useRef, useMemo } from 'react';
import { Box, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { PageLayout } from '@/components/Responsive/index';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import TheForm, { type TheFormRef } from './components/TheForm';
import TheTree, { type TheTreeRef } from './components/TheTree';

export interface Props {
  localObj: LocalObj;
}

export interface LocalObj {
  treeRef: React.RefObject<TheTreeRef | null>;
  formRef: React.RefObject<TheFormRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
}

export default function ThePage() {
  const treeRef = useRef<TheTreeRef>(null);
  const formRef = useRef<TheFormRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const localObj: LocalObj = useMemo(() => ({ treeRef, formRef, filterRef }), []);

  const handleAddMenu = () => {
    if (formRef.current) {
      formRef.current.openAdd();
    }
  };

  return (
    <PageLayout
      title="菜单管理"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddMenu}
          >
            添加菜单
          </Button>
        </Box>
      }
    >
      <TheFilter ref={localObj.filterRef} localObj={localObj} />
      <TheForm ref={localObj.formRef} localObj={localObj} />
      <TheTree ref={localObj.treeRef} localObj={localObj} />
    </PageLayout>
  );
}
