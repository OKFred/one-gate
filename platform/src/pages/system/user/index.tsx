import { useEffect, useState, useCallback } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import * as UserApiService from '@/api/system/user';
import { PageLayout, ResponsiveButton } from '@/layout/responsive';
import UserFilter from './components/UserFilter';
import UserTable from './components/UserTable';
import UserForm from './components/UserForm';
import type { FilterState, User, AddUserParams } from './type';

// 默认表单数据
const defaultFormData: AddUserParams = {
  username: '',
  password: '',
  departmentId: null,
  roleIdArr: [3],
  isEnabled: true,
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    orderBy: 'id',
    descend: true,
  });
  const [form, setForm] = useState<AddUserParams>(defaultFormData);

  // 获取用户列表
  const fetchUsers = useCallback(
    async (searchParams: FilterState, currentPage: number = 1) => {
      setLoading(true);
      try {
        const requestData = {
          pageNo: currentPage,
          pageSize,
          ...(searchParams.keyword && { keyword: searchParams.keyword }),
          orderBy: searchParams.orderBy,
          descend: searchParams.descend,
        };

        const res = await UserApiService.listFn({ data: requestData });
        const response = res.data;
        const usersList = response?.data?.list || [];
        const total = response?.data?.total || 0;

        setUsers(usersList);
        setTotalCount(total);
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      setPage(1);
      fetchUsers(newFilters, 1);
    },
    [fetchUsers],
  );

  // 处理分页变化
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchUsers(filters, newPage);
    },
    [fetchUsers, filters],
  );

  // 初始化加载
  useEffect(() => {
    fetchUsers({
      keyword: '',
      orderBy: 'id',
      descend: true,
    });
  }, [fetchUsers]);

  // 编辑用户
  const handleEdit = (user: User) => {
    setEditId(user.id);
    setForm({
      username: user.username || '',
      password: '',
      departmentId: user.departmentId || null,
      roleIdArr: user.roleIdArr || [3],
      isEnabled: user.isEnabled,
    });
    setOpen(true);
  };

  // 添加用户
  const handleAdd = () => {
    setEditId(null);
    setForm(defaultFormData);
    setOpen(true);
  };

  // 删除用户
  const handleDelete = async (id: number) => {
    await UserApiService.deleteFn({ data: { id } });
    fetchUsers(filters, page);
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = { ...form };

    if (editId) {
      // 编辑用户 - 如果密码为空则不传
      const updateData = formData.password
        ? { id: editId, ...formData }
        : { id: editId, ...formData, password: undefined };
      await UserApiService.updateFn({ data: updateData });
    } else {
      // 添加用户
      await UserApiService.addFn({ data: formData });
    }
    handleCancel();
    fetchUsers(filters, page);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditId(null);
    setOpen(false);
    setForm(defaultFormData);
  };

  return (
    <PageLayout
      title="用户管理"
      actions={
        <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          添加用户
        </ResponsiveButton>
      }
    >
      {/* 筛选组件 */}
      <UserFilter onFilterChange={handleFilterChange} filterCount={totalCount} />

      {/* 表单对话框 */}
      <UserForm
        open={open}
        form={form}
        editId={editId}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />

      {/* 数据表格 */}
      <UserTable
        users={users}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        page={page}
        pageSize={pageSize}
        total={totalCount}
        onPageChange={handlePageChange}
      />
    </PageLayout>
  );
}
