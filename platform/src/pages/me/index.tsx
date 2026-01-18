/**
 * 用户中心页面 - 响应式设计
 * 展示当前用户的个人信息，支持编辑更新
 */

import { useState, useEffect, useCallback } from 'react';
import { CircularProgress, Alert, Box } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import * as UserApiService from '@/api/system/user';
import { showGlobalNotification } from '@/components/Notification';
import { PageLayout, ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheProfile from './components/TheProfile';
import TheDetails from './components/TheDetails';
import TheDialog from './components/TheDialog';
import type { User } from './type';
import type { UpdateUserReq } from '@/api/system/type';

export default function UserCenter() {
  const t = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    try {
      // 先从本地存储获取用户基本信息
      const localUser = localStorage.getItem('userInfo');
      if (localUser) {
        const parsedUser = JSON.parse(localUser);
        // 然后从服务器获取最新的用户信息
        const response = await UserApiService.getFn({ data: { id: parsedUser.id } });
        if (response.data) {
          setCurrentUser(response.data.data);
        }
      }
    } catch (error) {
      showGlobalNotification({
        type: 'error',
        message: error instanceof Error ? error.message : t('me.getUserFailed'),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开编辑对话框
  const handleEdit = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  // 关闭编辑对话框
  const handleCloseEdit = useCallback(() => {
    setEditDialogOpen(false);
  }, []);

  // 保存用户信息
  const handleSave = useCallback(
    async (formData: UpdateUserReq) => {
      if (!currentUser) return;

      setLoading(true);
      if (!currentUser.id) return;
      try {
        const updateData: UpdateUserReq = {
          id: currentUser.id,
          username: formData?.username,
          departmentObj: formData?.departmentObj,
          roleArr: formData?.roleArr,
          isEnabled: formData?.isEnabled || false,
        };

        await UserApiService.updateFn(updateData);
        showGlobalNotification({ type: 'success', message: t('me.updateSuccess') });
        setEditDialogOpen(false);
        await fetchCurrentUser();
      } catch (error) {
        showGlobalNotification({
          type: 'error',
          message: error instanceof Error ? error.message : t('me.updateFailed'),
        });
      } finally {
        setLoading(false);
      }
    },
    [currentUser, fetchCurrentUser],
  );

  // 刷新用户信息
  const handleRefresh = useCallback(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // 加载状态
  if (loading && !currentUser) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  // 未找到用户信息
  if (!currentUser) {
    return (
      <PageLayout title={t('me.title')}>
        <Box textAlign="center" p={4}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('me.getUserFailed')}
          </Alert>
          <ResponsiveButton variant="contained" onClick={fetchCurrentUser}>
            {t('common.reload')}
          </ResponsiveButton>
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={t('me.title')}
      actions={
        <ResponsiveButton
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          {t('common.refresh')}
        </ResponsiveButton>
      }
    >
      {/* 用户信息展示 */}
      <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} gap={3}>
        {/* 用户资料卡片 */}
        <Box>
          <TheProfile user={currentUser} onEdit={handleEdit} />
        </Box>

        {/* 详细信息卡片 */}
        <Box>
          <TheDetails user={currentUser} onEdit={handleEdit} />
        </Box>
      </Box>

      {/* 编辑用户信息对话框 */}
      <TheDialog
        open={editDialogOpen}
        user={currentUser}
        loading={loading}
        onClose={handleCloseEdit}
        onSave={handleSave}
      />
    </PageLayout>
  );
}
