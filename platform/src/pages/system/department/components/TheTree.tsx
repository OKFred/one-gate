import { useState, forwardRef, useImperativeHandle, memo, useCallback, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import * as DepartmentAPI from '@/api/system/department';
import type { DepartmentData } from './TheForm';
import type { Props } from '../index';
import { showGlobalNotification } from '@/components/Notification';
import type { FilterState } from './TheFilter';

// 暴露给父组件的方法
export interface TheTreeRef {
  /** 刷新树形结构 */
  refresh: (filters?: FilterState) => void;
}

const TheTree = memo(
  forwardRef<TheTreeRef, Props>(({ localObj }, ref) => {
    const { formRef } = localObj;

    const [departments, setDepartments] = useState<DepartmentData[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [departmentToDelete, setDepartmentToDelete] = useState<DepartmentData | null>(null);
    const [filters, setFilters] = useState<FilterState>({ keyword: '', isEnabled: undefined });

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
            dept.name.toLowerCase().includes(searchFilters.keyword.toLowerCase()) ||
            (dept.description &&
              dept.description.toLowerCase().includes(searchFilters.keyword.toLowerCase()));

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

          if (searchFilters) {
            setFilters(searchFilters);
          }
        } catch (err) {
          console.error(err);
          showGlobalNotification({ message: '获取部门列表失败', type: 'error' });
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

    // 删除部门
    const handleDelete = (department: DepartmentData) => {
      setDepartmentToDelete(department);
      setDeleteDialogOpen(true);
    };

    // 确认删除
    const confirmDeleteDepartment = async () => {
      if (!departmentToDelete) return;

      setLoading(true);
      try {
        await DepartmentAPI.deleteFn({ data: { id: departmentToDelete.id } });
        fetchDepartments(filters);
        setDeleteDialogOpen(false);
        setDepartmentToDelete(null);
        showGlobalNotification({ message: '部门删除成功', type: 'success' });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // 取消删除
    const cancelDelete = () => {
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    };

    // 获取所有展开项的ID（递归遍历所有层级）
    const getAllExpandedIds = useCallback((deptList: DepartmentData[]): string[] => {
      const ids: string[] = [];
      const traverse = (items: DepartmentData[]) => {
        items.forEach((item) => {
          if (item.children && item.children.length > 0) {
            ids.push(item.id.toString());
            traverse(item.children); // 递归遍历子节点
          }
        });
      };
      traverse(deptList);
      return ids;
    }, []);

    // 渲染树节点（递归渲染无限层级）
    const renderTree = useCallback(
      (nodes: DepartmentData[]) =>
        nodes.map((node) => (
          <TreeItem
            key={node.id}
            itemId={node.id.toString()}
            label={
              <Box display="flex" alignItems="center" py={0.5}>
                <ApartmentIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                <Typography sx={{ flexGrow: 1 }}>
                  {node.name}
                  {node.description && (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      ({node.description})
                    </Typography>
                  )}
                  {!node.isEnabled && (
                    <Typography component="span" variant="body2" color="error" sx={{ ml: 1 }}>
                      [已禁用]
                    </Typography>
                  )}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (formRef.current) {
                        formRef.current.openAdd(node.id);
                      }
                    }}
                    title="添加子部门"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (formRef.current) {
                        formRef.current.openEdit(node);
                      }
                    }}
                    title="编辑"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(node);
                    }}
                    title="删除"
                    disabled={!!(node.children && node.children.length > 0)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            }
          >
            {/* 递归渲染子节点，支持无限层级 */}
            {node.children && node.children.length > 0 && renderTree(node.children)}
          </TreeItem>
        )),
      [formRef],
    );

    return (
      <>
        {/* 部门树 */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : departments.length > 0 ? (
            <SimpleTreeView
              slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
              defaultExpandedItems={getAllExpandedIds(departments)}
            >
              {renderTree(departments)}
            </SimpleTreeView>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={4}>
              暂无部门数据，点击上方按钮添加
            </Typography>
          )}
        </Box>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除部门 "<strong>{departmentToDelete?.name}</strong>" 吗？此操作不可恢复。
            </Typography>
            {departmentToDelete?.children && departmentToDelete.children.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                该部门存在子部门，请先删除子部门后再删除该部门。
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete} disabled={loading}>
              取消
            </Button>
            <Button
              onClick={confirmDeleteDepartment}
              color="error"
              variant="contained"
              disabled={
                loading ||
                !!(departmentToDelete?.children && departmentToDelete.children.length > 0)
              }
            >
              {loading ? <CircularProgress size={20} /> : '删除'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }),
);

TheTree.displayName = 'TheTree';

export default TheTree;
