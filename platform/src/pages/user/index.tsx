/**
 * 用户中心页面 - 响应式设计
 * 展示当前用户的个人信息，支持编辑更新
 */

import { useState, useEffect, useCallback } from 'react';
import { CircularProgress, Alert, Box } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { UserApiService, type User, type UserUpdateRequest } from '@/api/user';
import { PageLayout, ResponsiveButton } from '@/layout/responsive';
import UserProfile from './components/UserProfile';
import UserDetails from './components/UserDetails';
import UserEditDialog from './components/UserEditDialog';

interface FormData {
  username: string;
  password: string;
  department: string;
  role: string;
  isEnabled: boolean;
}

export default function UserCenter() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 显示消息
  const showAlert = useCallback((type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  }, []);

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    try {
      // 先从本地存储获取用户基本信息
      const localUser = UserApiService.getCurrentUser();
      if (localUser) {
        setCurrentUser(localUser);
        
        // 然后从服务器获取最新的用户信息
        const response = await UserApiService.getUser({ id: localUser.id });
        if (response.ok && response.data) {
          setCurrentUser(response.data);
          UserApiService.updateCurrentUser(response.data);
        }
      }
    } catch (error) {
      showAlert('error', error instanceof Error ? error.message : '获取用户信息失败');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  // 打开编辑对话框
  const handleEdit = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  // 关闭编辑对话框
  const handleCloseEdit = useCallback(() => {
    setEditDialogOpen(false);
  }, []);

  // 保存用户信息
  const handleSave = useCallback(async (formData: FormData) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const updateData: UserUpdateRequest = {
        id: currentUser.id,
        username: formData.username,
        department: formData.department,
        role: formData.role,
        isEnabled: formData.isEnabled,
      };

      // 只有输入了新密码才更新密码
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      const response = await UserApiService.updateUser(updateData);
      if (response.ok) {
        showAlert('success', '用户信息更新成功');
        setEditDialogOpen(false);
        await fetchCurrentUser(); // 重新获取用户信息
      } else {
        showAlert('error', response.message || '更新失败');
      }
    } catch (error) {
      showAlert('error', error instanceof Error ? error.message : '更新用户信息失败');
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchCurrentUser, showAlert]);

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
      <PageLayout title="用户中心">
        <Box textAlign="center" p={4}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            无法获取用户信息
          </Alert>
          <ResponsiveButton variant="contained" onClick={fetchCurrentUser}>
            重新加载
          </ResponsiveButton>
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="用户中心"
      actions={
        <ResponsiveButton 
          variant="outlined" 
          startIcon={<RefreshIcon />} 
          onClick={handleRefresh}
          disabled={loading}
        >
          刷新
        </ResponsiveButton>
      }
    >
      {/* 警告提示 */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }}
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* 用户信息展示 */}
      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: '1fr', md: '1fr 2fr' }} 
        gap={3}
      >
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
