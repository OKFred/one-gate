import { useEffect, useState, useCallback } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import * as UserAPI from '@/api/system/user';
import * as RoleAPI from '@/api/system/role';
import * as DepartmentAPI from '@/api/system/department';
import type { AddUserReq, ListUserReq, ListUserRes, TreeDepartmentRes } from '@/api/system/type';
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

// 默认表单数据
const defaultFormData: AddUserReq = {
  username: '',
  password: '',
  departmentObj: null,
  roleArr: [],
  langCode: '',
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
  const [roleOptions, setRoleOptions] = useState<{ value: number; label: string }[]>([]);
  const [departmentTree, setDepartmentTree] = useState<TreeDepartmentRes>([]);

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

  // 获取角色和部门数据
  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await RoleAPI.listAllFn({ data: {} });
        const roles = res.data.data || [];
        const options = roles.map((role) => ({
          value: role.id,
          label: role.name,
        }));
        setRoleOptions(options);
      } catch (error) {
        console.error('获取角色列表失败:', error);
      }
    }

    async function fetchDepartments() {
      try {
        const res = await DepartmentAPI.treeFn({ data: {} });
        const departments = res.data.data || [];
        setDepartmentTree(departments);
      } catch (error) {
        console.error('获取部门列表失败:', error);
      }
    }

    fetchRoles();
    fetchDepartments();
  }, []);

  // 初始化加载
  useEffect(() => {
    fetchUsers({
      keyword: '',
      orderBy: 'id',
      descend: true,
    });
  }, [fetchUsers]);

  // 编辑用户
  const handleEdit = async (row: NonNullable<ListUserRes['list']>[0]) => {
    const detail = await UserAPI.getFn({ data: { id: row.id! } }).then((res) => res.data.data);
    setEditId(detail.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { creatorId, updaterId, createTimeUtc, updateTimeUtc, ...rest } = detail;
    setForm({
      ...rest,
      password: '',
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
        roleOptions={roleOptions}
        departmentTree={departmentTree}
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
        roleOptions={roleOptions}
        departmentTree={departmentTree}
      />
    </PageLayout>
  );
}
