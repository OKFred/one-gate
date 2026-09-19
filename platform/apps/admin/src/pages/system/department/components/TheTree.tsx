import {
  useState,
  forwardRef,
  useImperativeHandle,
  memo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { Alert, Button, Box, CircularProgress, Typography } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import * as DepartmentAPI from '@/api/admin/system/department';
import type { DepartmentData } from './TheForm';
import type { Props } from '../index';
import type { FilterState } from './TheFilter';
import { TreeNodeActionButtons } from './TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';
import { usePermission, permissions } from '@/hooks/usePermission';
import { captureAuthSession, isCurrentAuthSession } from '@/utils/auth';
import {
  captureUndoRequestTime,
  showDeleteUndo,
  subscribeResourceChanges,
  publishResourceChange,
} from '@/utils/delete-undo';
import { classifyApiFailure } from '@/api/config';

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
    const filters = useRef<FilterState>({ keyword: '', isEnabled: undefined });
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [listFailed, setListFailed] = useState(false);
    const [quietFailure, setQuietFailure] = useState(false);
    const requestVersion = useRef(0);
    const mounted = useRef(false);
    const mutationInFlight = useRef(false);
    const permissionState = usePermission();
    const permissionRef = useRef(permissionState);
    permissionRef.current = permissionState;

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
      async (searchFilters: FilterState = filters.current, quiet = false): Promise<boolean> => {
        if (!mounted.current) return true;
        const version = ++requestVersion.current;
        filters.current = searchFilters;
        setLoading(true);
        setListFailed(false);
        setQuietFailure(false);
        setDepartments([]);
        try {
          const requestData = {
            descend: false,
            ...(searchFilters?.keyword && { keyword: searchFilters.keyword }),
            ...(searchFilters?.isEnabled !== undefined && { isEnabled: searchFilters.isEnabled }),
          };
          const res = await DepartmentAPI.listAllFn({
            data: requestData,
            errorPresentation: 'local',
          });
          if (!mounted.current || version !== requestVersion.current) return true;
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

          return true;
        } catch {
          if (!mounted.current || version !== requestVersion.current) return true;
          setListFailed(true);
          setQuietFailure(quiet);
          return false;
        } finally {
          if (mounted.current && version === requestVersion.current) setLoading(false);
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
            fetchDepartments(filters.current);
          }
        },
      }),
      [fetchDepartments],
    );

    // 初始加载 - 仅在组件挂载时调用
    useEffect(() => {
      mounted.current = true;
      const unsubscribe = subscribeResourceChanges('department', (presentation) =>
        fetchDepartments(filters.current, presentation === 'local'),
      );
      fetchDepartments();
      return () => {
        mounted.current = false;
        requestVersion.current += 1;
        unsubscribe();
      };
    }, [fetchDepartments]);

    // 删除成功后的回调
    const handleDeleteSuccess = useCallback(
      async (department: DepartmentData) => {
        if (mutationInFlight.current) return;
        mutationInFlight.current = true;
        const session = captureAuthSession();
        const requestStartedAt = captureUndoRequestTime();
        const name = department.name ?? t('deleteUndo.record', { id: department.id });
        const canOpenRecycleBin = () =>
          permissionRef.current.hasAllPermissions([
            permissions.admin.maintenance.recycle_bin.read,
            permissions.admin.maintenance.recycle_bin.restore,
            permissions.admin.system.department.read,
            permissions.admin.system.department.edit,
          ]);
        const verifyCurrent = async (): Promise<true | null> => {
          if (
            !isCurrentAuthSession(session) ||
            !permissionRef.current.hasAllPermissions([permissions.admin.system.department.read])
          )
            return null;
          try {
            const response = await DepartmentAPI.getFn({
              data: { id: department.id },
              errorPresentation: 'local',
            });
            return response.data?.ok === true && response.data.data?.id === department.id
              ? true
              : null;
          } catch {
            return null;
          }
        };
        try {
          const result = await DepartmentAPI.deleteWithUndoFn({
            data: { id: department.id, expectedUpdateTimeUtc: department.updateTimeUtc ?? null },
            errorPresentation: 'local',
          }).then(
            (response) => ({ ok: true as const, response }),
            (error: unknown) => ({ ok: false as const, failure: classifyApiFailure(error) }),
          );
          if (!isCurrentAuthSession(session)) return;
          if (!result.ok && result.failure.kind === 'session') return;
          if (!result.ok && result.failure.kind === 'business') {
            // This mutation did not succeed; the common local notice owns its failure.
            showDeleteUndo({
              receipt: null,
              resourceType: 'department',
              id: department.id,
              name,
              session,
              requestStartedAt,
              canOpenRecycleBin,
              verifyCurrent,
              deletionFailure: result.failure,
            });
            return;
          }
          showDeleteUndo({
            receipt:
              result.ok && result.response.data?.ok === true ? result.response.data.data : null,
            resourceType: 'department',
            id: department.id,
            name,
            session,
            requestStartedAt,
            canOpenRecycleBin,
            verifyCurrent,
            retryableErrorCodes: [
              'errorHandler.department.nameConflict',
              'errorHandler.department.invalidParent',
            ],
            stateChangedErrorCodes: [
              'errorHandler.department.staleDeletion',
              'errorHandler.department.notDeleted',
              'errorHandler.department.stateConflict',
            ],
          });
          await publishResourceChange('department', 'page');
        } catch {
          // The local coordinator or authentication layer presents the result.
        } finally {
          mutationInFlight.current = false;
        }
      },
      [t],
    );

    // 渲染树节点（递归渲染无限层级）
    const renderTree = useCallback(
      (nodes: DepartmentData[]) =>
        nodes.map((node) => {
          return (
            <TreeItem
              key={node.id}
              itemId={node.id.toString()}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                  <ApartmentIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                  <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
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
                  </Box>
                  <TreeNodeActionButtons
                    node={node}
                    formRef={formRef}
                    onDeleteSuccess={() => handleDeleteSuccess(node)}
                  />
                </Box>
              }
            >
              {/* 递归渲染子节点，支持无限层级 */}
              {node.children && node.children.length > 0 && renderTree(node.children)}
            </TreeItem>
          );
        }),
      [formRef, handleDeleteSuccess, t],
    );

    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : listFailed && quietFailure ? (
          <Button onClick={() => void fetchDepartments()}>
            {t('deleteUndo.reloadDepartmentList')}
          </Button>
        ) : listFailed ? (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" onClick={() => void fetchDepartments()}>
                {t('common.refresh')}
              </Button>
            }
          >
            {t('deleteUndo.listFailed')}
          </Alert>
        ) : departments.length > 0 ? (
          <SimpleTreeView
            slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
            expandedItems={expandedItems}
            onExpandedItemsChange={(_, itemIds) => setExpandedItems(itemIds)}
          >
            {renderTree(departments)}
          </SimpleTreeView>
        ) : (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {t('column.noData')}
          </Typography>
        )}
      </Box>
    );
  }),
);

TheTree.displayName = 'TheTree';

export default TheTree;
