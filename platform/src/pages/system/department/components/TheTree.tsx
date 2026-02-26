import {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  memo,
  useCallback,
  useEffect,
} from 'react';
import { Box, CircularProgress, Typography, Chip } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Apartment as ApartmentIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import * as DepartmentAPI from '@/api/system/department';
import * as UserAPI from '@/api/system/user';
import type { DepartmentData } from './TheForm';
import type { ListAllUserRes } from '@/api/system/type';
import type { Props } from '../index';
import { showSnackbar } from '@/components/Notification';
import type { FilterState } from './TheFilter';
import { TreeNodeActionButtons } from './TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheTreeRef {
  /** 刷新树形结构 */
  refresh: (filters?: FilterState) => void;
}

const TheTree = memo(
  forwardRef<TheTreeRef, Props>(({ localObj }, ref) => {
    const { formRef } = localObj;
    const t = useTranslation();

    const [departments, setDepartments] = useState<DepartmentData[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<FilterState>({ keyword: '', isEnabled: undefined });
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [allUsers, setAllUsers] = useState<ListAllUserRes>([]);
    const allUsersCacheRef = useRef<ListAllUserRes | null>(null);

    // 将扁平的部门列表构造成树形结构（支持无限层级）
    const buildTree = useCallback((list: DepartmentData[]): DepartmentData[] => {
      const map = new Map<number, DepartmentData & { children?: DepartmentData[] }>();

      // 第一遍遍历：将所有部门放入Map，并初始化children数组
      list.forEach((item) => {
        map.set(item.id, { ...item, children: [] });
      });

      const roots: DepartmentData[] = [];

      // 第二遍遍历：建立父子关系
      map.forEach((node) => {
        const pid = node.parentId as number | null | undefined;
        if (pid != null && map.has(pid)) {
          // 有父部门且父部门存在，添加到父部门的children中
          const parent = map.get(pid)!;
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          // 无父部门或父部门不存在，作为根节点
          roots.push(node);
        }
      });

      return roots;
    }, []);

    // 过滤部门树（支持无限层级递归过滤）
    const filterDepartments = useCallback(
      (deptList: DepartmentData[], searchFilters: FilterState): DepartmentData[] => {
        if (!searchFilters.keyword && searchFilters.isEnabled === undefined) {
          return deptList;
        }

        const filtered: DepartmentData[] = [];

        deptList.forEach((dept) => {
          // 递归过滤子部门
          const childrenFiltered = dept.children
            ? filterDepartments(dept.children, searchFilters)
            : [];

          // 检查当前部门是否匹配关键词
          const matchesKeyword =
            !searchFilters.keyword ||
            dept.name?.toLowerCase().includes(searchFilters.keyword.toLowerCase()) ||
            (dept.remark &&
              dept.remark.toLowerCase().includes(searchFilters.keyword.toLowerCase()));

          // 检查当前部门是否匹配启用状态
          const matchesEnabled =
            searchFilters.isEnabled === undefined || dept.isEnabled === searchFilters.isEnabled;

          // 如果部门本身匹配或子部门包含匹配项，则保留
          if (
            (matchesKeyword && matchesEnabled) ||
            (childrenFiltered.length > 0 && searchFilters.keyword)
          ) {
            filtered.push({
              ...dept,
              children: childrenFiltered.length > 0 ? childrenFiltered : dept.children,
            });
          }
        });

        return filtered;
      },
      [],
    );

    // 获取部门树
    const fetchDepartments = useCallback(
      async (searchFilters?: FilterState) => {
        setLoading(true);
        try {
          // 获取用户列表（缓存，只请求一次）
          if (allUsersCacheRef.current === null) {
            const userRes = await UserAPI.listAllFn({ data: { isEnabled: true } });
            allUsersCacheRef.current = userRes.data.data || [];
            setAllUsers(allUsersCacheRef.current);
          }

          const requestData = {
            descend: false,
            ...(searchFilters?.keyword && { keyword: searchFilters.keyword }),
            ...(searchFilters?.isEnabled !== undefined && { isEnabled: searchFilters.isEnabled }),
          };
          const res = await DepartmentAPI.listAllFn({ data: requestData });
          const listData = (res.data.data || []) as DepartmentData[];

          // 将扁平列表构造成树形结构
          const treeData = buildTree(listData);

          // 应用筛选
          const currentFilters = searchFilters || { keyword: '', isEnabled: undefined };
          const filteredData = filterDepartments(treeData, currentFilters);
          setDepartments(filteredData);
          // 设置所有节点为展开状态
          const expandedIds: string[] = [];
          const traverse = (items: DepartmentData[]) => {
            items.forEach((item) => {
              if (item.children && item.children.length > 0) {
                expandedIds.push(item.id.toString());
                traverse(item.children);
              }
            });
          };
          traverse(filteredData);
          setExpandedItems(expandedIds);

          if (searchFilters) {
            setFilters(searchFilters);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      },
      [buildTree, filterDepartments],
    );

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          if (newFilters) {
            fetchDepartments(newFilters);
          } else {
            // 使用当前过滤条件重新获取
            fetchDepartments(filters);
          }
        },
      }),
      [fetchDepartments, filters],
    );

    // 初始加载 - 仅在组件挂载时调用
    useEffect(() => {
      fetchDepartments();
    }, [fetchDepartments]);

    // 删除成功后的回调
    const handleDeleteSuccess = useCallback(
      async (deptId: number) => {
        setLoading(true);
        try {
          await DepartmentAPI.deleteFn({ data: { id: deptId } });
          fetchDepartments(filters);
          showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      },
      [fetchDepartments, filters, t],
    );

    // 渲染树节点（递归渲染无限层级）
    const renderTree = useCallback(
      (nodes: DepartmentData[]) =>
        nodes.map((node) => {
          // 获取管理员信息
          const managers = (node.managerIdArr || [])
            .map((userId) => allUsers.find((u) => u.id === userId))
            .filter(Boolean);

          return (
            <TreeItem
              key={node.id}
              itemId={node.id.toString()}
              label={
                <Box display="flex" alignItems="center" py={0.5}>
                  <ApartmentIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                  <Box sx={{ flexGrow: 1 }} alignItems="center" display="flex">
                    {node.name}
                    {node.remark && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        ({node.remark})
                      </Typography>
                    )}
                    {!node.isEnabled && (
                      <Typography component="span" variant="body2" color="error" sx={{ ml: 1 }}>
                        [{t('status.disabled')}]
                      </Typography>
                    )}
                    {managers.length > 0 && (
                      <Box component="span" sx={{ ml: 1, display: 'inline-flex', gap: 0.5 }}>
                        {managers.map((manager) => (
                          <Chip
                            key={manager!.id}
                            icon={<PersonIcon />}
                            label={manager!.username}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                  <TreeNodeActionButtons
                    node={node}
                    formRef={formRef}
                    onDeleteSuccess={() => handleDeleteSuccess(node.id)}
                  />
                </Box>
              }
            >
              {/* 递归渲染子节点，支持无限层级 */}
              {node.children && node.children.length > 0 && renderTree(node.children)}
            </TreeItem>
          );
        }),
      [formRef, handleDeleteSuccess, allUsers, t],
    );

    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : departments.length > 0 ? (
          <SimpleTreeView
            slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
            expandedItems={expandedItems}
            onExpandedItemsChange={(_, itemIds) => setExpandedItems(itemIds)}
          >
            {renderTree(departments)}
          </SimpleTreeView>
        ) : (
          <Typography color="text.secondary" textAlign="center" py={4}>
            {t('common.noData')}
          </Typography>
        )}
      </Box>
    );
  }),
);

TheTree.displayName = 'TheTree';

export default TheTree;
