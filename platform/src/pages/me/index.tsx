import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheProfile, { type TheProfileRef } from './components/TheProfile';
import TheDetails, { type TheDetailsRef } from './components/TheDetails';
import * as AuthApi from '@/api/infra/system/auth';
export interface Props {
  localObj: LocalObj;
}

export interface LocalObj {
  profileRef: React.RefObject<TheProfileRef | null>;
  detailsRef: React.RefObject<TheDetailsRef | null>;
  onRefresh: () => void;
}

export default function Page() {
  const t = useTranslation();
  const profileRef = useRef<TheProfileRef>(null);
  const detailsRef = useRef<TheDetailsRef>(null);

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async () => {
    try {
      // 先从本地存储获取用户基本信息
      const response = await AuthApi.getProfileFn({ data: {} });
      const { userObj } = response.data.data;

      // 通知各个组件更新数据
      profileRef.current?.updateUser(userObj);
      detailsRef.current?.updateUser(userObj);
    } catch (error) {
      console.warn(error);
    }
  }, []);

  const localObj: LocalObj = useMemo(
    () => ({ profileRef, detailsRef, onRefresh: fetchCurrentUser }),
    [fetchCurrentUser],
  );

  // 初始化加载
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <PageLayout title={t('me.title')}>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' } }}>
        {/* 用户资料卡片 */}
        <Box>
          <TheProfile ref={profileRef} localObj={localObj} />
        </Box>

        {/* 详细信息卡片 */}
        <Box>
          <TheDetails ref={detailsRef} localObj={localObj} />
        </Box>
      </Box>
    </PageLayout>
  );
}
