import { useRef, useMemo } from 'react';
import { Box } from '@mui/material';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheProfile, { type TheProfileRef } from './components/TheProfile';
import TheDetails, { type TheDetailsRef } from './components/TheDetails';
import ThePasswordDialog, { type ThePasswordDialogRef } from './components/ThePasswordDialog';
import TheEditDialog, { type TheEditDialogRef } from './components/TheEditDialog';
import TheData, { type TheDataRef } from './components/TheData';

export interface Props {
  localObj: LocalObj;
}

export interface LocalObj {
  dataRef: React.RefObject<TheDataRef | null>;
  profileRef: React.RefObject<TheProfileRef | null>;
  detailsRef: React.RefObject<TheDetailsRef | null>;
  passwordDialogRef: React.RefObject<ThePasswordDialogRef | null>;
  editDialogRef: React.RefObject<TheEditDialogRef | null>;
}

export default function UserCenter() {
  const t = useTranslation();
  const dataRef = useRef<TheDataRef>(null);
  const profileRef = useRef<TheProfileRef>(null);
  const detailsRef = useRef<TheDetailsRef>(null);
  const passwordDialogRef = useRef<ThePasswordDialogRef>(null);
  const editDialogRef = useRef<TheEditDialogRef>(null);
  const localObj: LocalObj = useMemo(
    () => ({ dataRef, profileRef, detailsRef, passwordDialogRef, editDialogRef }),
    [],
  );

  return (
    <PageLayout title={t('me.title')}>
      {/* 数据管理组件 */}
      <TheData ref={dataRef} localObj={localObj} />

      {/* 用户信息展示 */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
        {/* 用户资料卡片 */}
        <Box>
          <TheProfile ref={profileRef} localObj={localObj} />
        </Box>

        {/* 详细信息卡片 */}
        <Box>
          <TheDetails ref={detailsRef} localObj={localObj} />
        </Box>
      </Box>

      {/* 编辑用户信息对话框 */}
      <ThePasswordDialog ref={passwordDialogRef} localObj={localObj} />
      <TheEditDialog ref={editDialogRef} localObj={localObj} />
    </PageLayout>
  );
}
