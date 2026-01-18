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
import UserProfile from './components/UserProfile';
import UserDetails from './components/UserDetails';
import UserEditDialog from './components/UserEditDialog';
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
          <UserProfile user={currentUser} onEdit={handleEdit} />
        </Box>

        {/* 详细信息卡片 */}
        <Box>
          <UserDetails user={currentUser} onEdit={handleEdit} />
        </Box>
      </Box>

      {/* 编辑用户信息对话框 */}
      <UserEditDialog
        open={editDialogOpen}
        user={currentUser}
        loading={loading}
        onClose={handleCloseEdit}
        onSave={handleSave}
      />
    </PageLayout>
  );
}

/**
 * 重构说明：
 *
 * 1. 响应式设计：
 *    - 使用 PageLayout 提供统一的布局结构
 *    - 使用 ResponsiveButton 等响应式组件
 *    - Grid 布局自动适配移动端
 *
 * 2. 组件解耦：
 *    - UserProfile: 用户资料卡片组件
 *    - UserDetails: 详细信息展示组件
 *    - UserEditDialog: 编辑对话框组件
 *
 * 3. 性能优化：
 *    - 使用 useCallback 避免不必要的重渲染
 *    - 清晰的状态管理和数据流
 *
 * 4. 用户体验：
 *    - 统一的错误处理和消息提示
 *    - 加载状态显示
 *    - 自动刷新机制
 */
