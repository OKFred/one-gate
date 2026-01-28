import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as RolePermissionAPI from '@/api/system/role_permission';
import { RolePermissionActionButtons } from './TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListRolePermissionRes } from '@/api/system/type';
import type { Props } from '../index';
import dayjs from 'dayjs';
// 筛选条件类型
export interface FilterState {
  keyword: string;
  roleId: number | null;
  permissionId: number | null;
  orderBy?: 'id' | 'createTimeUtc' | 'roleId' | 'permissionId';
  descend?: boolean;
}

// 表格内部状态
export interface TableState {
  list: NonNullable<ListRolePermissionRes['list']>;
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
  roleId: null,
  permissionId: null,
  orderBy: 'id',
  descend: false,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, allRoles, allPermissions } = localObj;
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

    // 根据角色ID获取角色名称
    const getRoleName = useCallback(
      (roleId: number | null | undefined): string => {
        if (!roleId) return '--';
        const role = allRoles.find((r) => r.id === roleId);
        return role?.name || '--';
      },
      [allRoles],
    );

    // 根据权限ID获取权限名称
    const getPermissionName = useCallback(
      (permissionId: number | null | undefined): string => {
        if (!permissionId) return '--';
        const permission = allPermissions.find((p) => p.id === permissionId);
        return permission?.name || '--';
      },
      [allPermissions],
    );

    // 获取数据的核心函数
    const fetchRolePermissions = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            ...(searchFilters.keyword && { keyword: searchFilters.keyword }),
            ...(searchFilters.roleId && { roleId: searchFilters.roleId }),
            ...(searchFilters.permissionId && { permissionId: searchFilters.permissionId }),
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          const res = await RolePermissionAPI.listFn({ data: requestData });
          const response = res.data;
          const rolePermissionsList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: rolePermissionsList,
            total: totalCount,
            page: currentPage,
            filters: searchFilters,
            loading: false,
          }));
        } catch {
          setState((prev) => ({ ...prev, loading: false }));
        }
      },
      [state.pageSize],
    );

    // 删除成功后的回调
    const handleDeleteSuccess = useCallback(() => {
      fetchRolePermissions(filters, page);
    }, [fetchRolePermissions, filters, page]);

    // 初始加载
    useEffect(() => {
      fetchRolePermissions(DEFAULT_FILTERS, 1);
    }, [fetchRolePermissions]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchRolePermissions(filtersToUse, pageToUse);
        },
      }),
      [fetchRolePermissions, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchRolePermissions(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      // 重置到第一页并刷新数据
      fetchRolePermissions(filters, 1);
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      { title: t('me.role'), render: (row) => getRoleName(row.roleId) },
      {
        title: t('sidebar.menu.system.permission'),
        render: (row) => getPermissionName(row.permissionId),
      },
      {
        title: t('rolePermission.resourceFilter'),
        render: (row) =>
          row.resourceFilter ? (
            <Chip label={t('rolePermission.hasFilter')} size="small" color="info" />
          ) : (
            '--'
          ),
      },
      {
        title: t('rolePermission.conditions'),
        render: (row) =>
          row.conditions ? (
            <Chip label={t('rolePermission.hasConditions')} size="small" color="warning" />
          ) : (
            '--'
          ),
      },
      {
        title: t('columns.createTime'),
        render: (row) =>
          row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: (row) => (
          <RolePermissionActionButtons
            row={row}
            formRef={formRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      { type: 'title', render: (row) => getPermissionName(row.permissionId) },
      {
        type: 'subtitle',
        label: t('rolePermission.role'),
        render: (row) => getRoleName(row.roleId),
      },
      {
        type: 'content',
        label: t('rolePermission.resourceFilter'),
        render: (row) => (row.resourceFilter ? t('rolePermission.hasFilter') : '--'),
      },
      {
        type: 'content',
        label: t('rolePermission.conditions'),
        render: (row) => (row.conditions ? t('rolePermission.hasConditions') : '--'),
      },
      {
        type: 'content',
        label: t('columns.createTime'),
        render: (row) =>
          row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
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
          <RolePermissionActionButtons
            row={row}
            formRef={formRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        )}
      />
    );
  }),
);

export default TheTable;
