/**
 * 用户管理页面 - 响应式设计
 * 提供用户的增删改查功能，仅管理员可访问
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { UserApiService, type User, type UserAddRequest, type UserUpdateRequest, type UserListRequest } from '@/api/system/user';
import { showGlobalNotification } from '@/utils/notification';
import { PageLayout, ResponsiveButton } from '@/layout/responsive';
import UserFilter from './components/UserFilter';
import UserTable from './components/UserTable';
import UserFormDialog from './components/UserFormDialog';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 对话框状态
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: UserListRequest = {
        pageNo: page + 1,
        pageSize: rowsPerPage,
        orderBy: 'id',
        descend: true,
        keyword: searchKeyword || undefined,
      };

      const response = await UserApiService.getUserList(params);
      if (response.ok && response.data) {
        setUsers(response.data.list);
        setTotal(response.data.total);
      }
    } catch (error) {
      showGlobalNotification({ type: 'error', message: error instanceof Error ? error.message : '获取用户列表失败' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchKeyword]);

  // 处理搜索
  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(0);
  }, []);

  // 打开添加用户对话框
  const handleAddUser = useCallback(() => {
    setEditingUser(null);
    setFormDialogOpen(true);
  }, []);

  // 打开编辑用户对话框
  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
    setFormDialogOpen(true);
  }, []);

  // 关闭表单对话框
  const handleCloseFormDialog = useCallback(() => {
    setFormDialogOpen(false);
    setEditingUser(null);
  }, []);

  // 保存用户（添加或编辑）
  const handleSaveUser = useCallback(async (userData: UserAddRequest | UserUpdateRequest) => {
    setLoading(true);
    try {
      let response;
      if ('id' in userData) {
        // 编辑用户
        response = await UserApiService.updateUser(userData);
        if (response.ok) {
          showGlobalNotification({ type: 'success', message: '用户更新成功' });
        }
      } else {
        // 添加用户
        response = await UserApiService.addUser(userData);
        if (response.ok) {
          showGlobalNotification({ type: 'success', message: '用户添加成功' });
        }
      }

      if (response.ok) {
        setFormDialogOpen(false);
        setEditingUser(null);
        await fetchUsers();
      } else {
        showGlobalNotification({ type: 'error', message: response.message || '操作失败' });
      }
    } catch (error) {
      showGlobalNotification({ type: 'error', message: error instanceof Error ? error.message : '操作失败' });
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  // 打开删除确认对话框
  const handleDeleteUser = useCallback((user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  }, []);

  // 确认删除用户
  const confirmDeleteUser = useCallback(async () => {
    if (!userToDelete) return;

    setLoading(true);
    try {
      const response = await UserApiService.deleteUser({ id: userToDelete.id });
      if (response.ok) {
        showGlobalNotification({ type: 'success', message: '用户删除成功' });
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        await fetchUsers();
      } else {
        showGlobalNotification({ type: 'error', message: response.message || '删除失败' });
      }
    } catch (error) {
      showGlobalNotification({ type: 'error', message: error instanceof Error ? error.message : '删除用户失败' });
    } finally {
      setLoading(false);
    }
  }, [userToDelete, fetchUsers]);

  // 取消删除
  const cancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  }, []);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 分页处理
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <PageLayout
      title="用户管理"
      actions={
        <>
          <ResponsiveButton
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            刷新
          </ResponsiveButton>
          <ResponsiveButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddUser}
          >
            添加用户
          </ResponsiveButton>
        </>
      }
    >
      {/* 搜索过滤器 */}
      <UserFilter onSearch={handleSearch} userCount={total} />

      {/* 用户表格 */}
      <UserTable
        users={users}
        loading={loading}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      {/* 添加/编辑用户对话框 */}
      <UserFormDialog
        open={formDialogOpen}
        user={editingUser}
        loading={loading}
        onClose={handleCloseFormDialog}
        onSave={handleSaveUser}
      />

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          确定要删除用户 "{userToDelete?.username}" 吗？此操作不可恢复。
        </DialogContent>
        <DialogActions>
          <ResponsiveButton onClick={cancelDelete}>
            取消
          </ResponsiveButton>
          <ResponsiveButton 
            onClick={confirmDeleteUser} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            删除
          </ResponsiveButton>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}

/**
 * 重构说明：
 * 
 * 1. 响应式设计：
 *    - 使用 PageLayout 提供统一的布局结构
 *    - 使用 ResponsiveButton 等响应式组件
 *    - 表格自动适配移动端显示
 * 
 * 2. 组件解耦：
 *    - UserFilter: 搜索过滤器组件
 *    - UserTable: 用户列表表格组件  
 *    - UserFormDialog: 用户添加/编辑对话框组件
 * 
 * 3. 性能优化：
 *    - 使用 useCallback 避免不必要的重渲染
 *    - 统一的数据获取和状态管理
 * 
 * 4. 用户体验：
 *    - 统一的错误处理和消息提示
 *    - 加载状态显示
 *    - 确认删除对话框
 *    - 分页和搜索功能
 */
