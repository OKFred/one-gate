import { useEffect, useState, useCallback } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import * as UserAPI from '@/api/system/user';
import type { ListUserReq, ListUserRes } from '@/api/system/type';
import { PageLayout, ResponsiveButton } from '@/components/Responsive/index';
import UserFilter from './components/UserFilter';
import UserTable from './components/UserTable';
import UserForm from './components/UserForm';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListUserReq['orderBy']>;
  descend: boolean;
}

// 表单数据类型（保持原有字段）
export interface AddUserReq {
  username: string;
  password: string;
  departmentId: number | null;
  roleIdArr: number[];
  isEnabled: boolean;
}

// 默认表单数据
const defaultFormData: AddUserReq = {
  username: '',
  password: '',
  departmentId: null,
  roleIdArr: [3],
  isEnabled: true,
};

export default function UserManagement() {
  const [list, setList] = useState<NonNullable<ListUserRes['list']>>([]);
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
  const [form, setForm] = useState<AddUserReq>(defaultFormData);

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

        const res = await UserAPI.listFn({ data: requestData });
        const response = res.data;
        const list = response?.data?.list || [];
        const total = response?.data?.total || 0;

        setList(list);
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
  const handleEdit = (row: NonNullable<ListUserRes['list']>[0]) => {
    setEditId(row.id);
    setForm({
      username: row.username || '',
      password: '',
      departmentId: row.departmentId || null,
      roleIdArr: row.roleIdArr || [3],
      isEnabled: row.isEnabled,
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
    await UserAPI.deleteFn({ data: { id } });
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
      await UserAPI.updateFn({
        data: updateData as unknown as Parameters<typeof UserAPI.updateFn>[0]['data'],
      });
    } else {
      // 添加用户
      await UserAPI.addFn({
        data: formData as unknown as Parameters<typeof UserAPI.addFn>[0]['data'],
      });
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
        list={list}
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
