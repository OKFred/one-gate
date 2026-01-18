import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as UserAPI from '@/api/system/user';
import * as RoleAPI from '@/api/system/role';
import * as DepartmentAPI from '@/api/system/department';
import { UserActionButtons } from './TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListUserRes, TreeDepartmentRes } from '@/api/system/type';
import type { Props } from '../index';
import dayjs from 'dayjs';
import type { FilterState } from './TheFilter';

// 表格内部状态
export interface TableState {
  list: NonNullable<ListUserRes['list']>;
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: FilterState;
}

// 暴露给父组件的方法
export interface TheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: true,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;
    const t = useTranslation();

    // 整合所有表格相关状态
    const [state, setState] = useState<TableState>({
      list: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: DEFAULT_FILTERS,
    });

    const { list, loading, page, pageSize, total, filters } = state;

    // 角色和部门数据
    const [roleOptions, setRoleOptions] = useState<{ value: number; label: string }[]>([]);
    const [departmentTree, setDepartmentTree] = useState<TreeDepartmentRes>([]);

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

    // 根据部门ID获取部门名称
    const getDepartmentName = useCallback(
      (departmentId: number | null | undefined): string => {
        if (!departmentId) return '--';
        const findDepartment = (
          tree: TreeDepartmentRes,
          id: number,
        ): TreeDepartmentRes[0] | null => {
          for (const node of tree) {
            if (node.id === id) return node;
            if (node.children) {
              const found = findDepartment(node.children as TreeDepartmentRes, id);
              if (found) return found;
            }
          }
          return null;
        };
        const department = findDepartment(departmentTree, departmentId);
        return department?.name || '--';
      },
      [departmentTree],
    );

    // 根据角色ID数组获取角色名称数组
    const getRoleNames = useCallback(
      (roleIds: number[] | null | undefined): string => {
        if (!roleIds || roleIds.length === 0) return '--';
        const names = roleIds
          .map((id) => roleOptions.find((role) => role.value === id)?.label)
          .filter(Boolean);
        return names.length > 0 ? names.join(', ') : '--';
      },
      [roleOptions],
    );

    // 获取数据的核心函数
    const fetchUsers = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            ...(searchFilters.keyword && { keyword: searchFilters.keyword }),
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          const res = await UserAPI.listFn({ data: requestData });
          const response = res.data;
          const usersList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: usersList,
            total: totalCount,
            page: currentPage,
            filters: searchFilters,
            loading: false,
          }));

          // 通知筛选组件更新数量
          filterRef.current?.updateCount(totalCount);
        } catch {
          setState((prev) => ({ ...prev, loading: false }));
        }
      },
      [state.pageSize, filterRef],
    );

    // 删除成功后的回调
    const handleDeleteSuccess = useCallback(() => {
      fetchUsers(filters, page);
    }, [fetchUsers, filters, page]);

    // 初始加载
    useEffect(() => {
      fetchUsers(DEFAULT_FILTERS, 1);
    }, [fetchUsers]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchUsers(filtersToUse, pageToUse);
        },
      }),
      [fetchUsers, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchUsers(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      // 重置到第一页并刷新数据
      fetchUsers(filters, 1);
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: t('common.columns.id'), render: (row) => row.id },
      { title: t('system.user.columns.username'), render: (row) => row.username },
      { title: t('system.user.columns.department'), render: (row) => getDepartmentName(row.departmentId) },
      { title: t('system.user.columns.roles'), render: (row) => getRoleNames(row.roleIdArr) },
      {
        title: t('common.columns.status'),
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('common.status.enabled') : t('common.status.disabled')}
            color={row.isEnabled ? 'success' : 'error'}
            size="small"
          />
        ),
      },
      {
        title: t('common.columns.createTime'),
        render: (row) =>
          row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
      },
      {
        title: t('common.columns.actions'),
        align: 'center',
        render: (row) => (
          <UserActionButtons row={row} formRef={formRef} onDeleteSuccess={handleDeleteSuccess} />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      { type: 'title', render: (row) => row.username },
      { type: 'subtitle', label: t('common.columns.id'), render: (row) => row.id },
      { type: 'content', label: t('system.user.columns.department'), render: (row) => getDepartmentName(row.departmentId) },
      { type: 'content', label: t('system.user.columns.roles'), render: (row) => getRoleNames(row.roleIdArr) },
      {
        type: 'content',
        label: t('common.columns.createTime'),
        render: (row) =>
          row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
      },
      {
        type: 'tags',
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('common.status.enabled') : t('common.status.disabled')}
            color={row.isEnabled ? 'success' : 'error'}
            size="small"
          />
        ),
      },
    ];

    return (
      <ResponsiveList
        data={list}
        loading={loading}
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        keyExtractor={(row) => row.id!}
        columns={columns}
        cardFields={cardFields}
        cardActions={(row) => (
          <UserActionButtons row={row} formRef={formRef} onDeleteSuccess={handleDeleteSuccess} />
        )}
        emptyText={t('system.user.empty')}
      />
    );
  }),
);

export default TheTable;
