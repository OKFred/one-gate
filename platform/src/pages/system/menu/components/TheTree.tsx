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
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import * as MenuAPI from '@/api/system/menu';
import type { MenuData } from './TheForm';
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

    const [menus, setMenus] = useState<MenuData[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [menuToDelete, setMenuToDelete] = useState<MenuData | null>(null);
    const [filters, setFilters] = useState<FilterState>({ keyword: '', isEnabled: undefined });

    // 将平铺的菜单列表构造成树形结构
    const buildTree = useCallback((list: MenuData[]): MenuData[] => {
      const map = new Map<number, MenuData & { children?: MenuData[] }>();
      list.forEach((item) => {
        // 确保 children 存在，便于后续遍历/展开
        map.set(item.id, { ...item, children: item.children ?? [] });
      });

      const roots: MenuData[] = [];
      map.forEach((node) => {
        const pid = node.parentId as number | null | undefined;
        if (pid != null && map.has(pid)) {
          const parent = map.get(pid)!;
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      });

      return roots;
    }, []);

    // 过滤菜单树
    const filterMenus = useCallback(
      (menuList: MenuData[], searchFilters: FilterState): MenuData[] => {
        if (!searchFilters.keyword && searchFilters.isEnabled === undefined) {
          return menuList;
        }

        const filtered: MenuData[] = [];

        menuList.forEach((menu) => {
          const childrenFiltered = menu.children ? filterMenus(menu.children, searchFilters) : [];

          const matchesKeyword =
            !searchFilters.keyword ||
            menu.name.toLowerCase().includes(searchFilters.keyword.toLowerCase()) ||
            (menu.path && menu.path.toLowerCase().includes(searchFilters.keyword.toLowerCase()));

          const matchesEnabled =
            searchFilters.isEnabled === undefined || menu.isEnabled === searchFilters.isEnabled;

          // 如果菜单本身匹配或子菜单包含匹配项，则保留
          if (
            (matchesKeyword && matchesEnabled) ||
            (childrenFiltered.length > 0 && searchFilters.keyword)
          ) {
            filtered.push({
              ...menu,
              children: childrenFiltered.length > 0 ? childrenFiltered : menu.children,
            });
          }
        });

        return filtered;
      },
      [],
    );

    // 获取菜单树
    const fetchMenus = useCallback(
      async (searchFilters?: FilterState) => {
        setLoading(true);
        try {
          const requestData = {
            ...(searchFilters?.keyword && { keyword: searchFilters.keyword }),
            ...(searchFilters?.isEnabled !== undefined && { isEnabled: searchFilters.isEnabled }),
          };
          const res = await MenuAPI.listAllFn({ data: requestData });
          const listData = (res.data.data || []) as MenuData[];
          const treeData = buildTree(listData);

          // 应用筛选
          const currentFilters = searchFilters || { keyword: '', isEnabled: undefined };
          const filteredData = filterMenus(treeData as MenuData[], currentFilters);
          setMenus(filteredData);
          if (searchFilters) {
            setFilters(searchFilters);
          }
        } catch (err) {
          console.error(err);
          showGlobalNotification({ message: '获取菜单列表失败', type: 'error' });
        } finally {
          setLoading(false);
        }
      },
      [buildTree, filterMenus],
    );

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          if (newFilters) {
            fetchMenus(newFilters);
          } else {
            // 使用当前过滤条件重新获取
            fetchMenus(filters);
          }
        },
      }),
      [fetchMenus, filters],
    );

    // 初始加载 - 仅在组件挂载时调用
    useEffect(() => {
      fetchMenus();
    }, [fetchMenus]);

    // 删除菜单
    const handleDelete = (menu: MenuData) => {
      setMenuToDelete(menu);
      setDeleteDialogOpen(true);
    };

    // 确认删除
    const confirmDeleteMenu = async () => {
      if (!menuToDelete) return;

      setLoading(true);
      try {
        await MenuAPI.deleteFn({ data: { id: menuToDelete.id } });
        fetchMenus();
        setDeleteDialogOpen(false);
        setMenuToDelete(null);
        showGlobalNotification({ message: '菜单删除成功', type: 'success' });
      } catch (err) {
        console.error(err);
        showGlobalNotification({ message: '删除失败，该菜单可能存在子菜单', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    // 取消删除
    const cancelDelete = () => {
      setDeleteDialogOpen(false);
      setMenuToDelete(null);
    };

    // 获取所有展开项的ID
    const getAllExpandedIds = useCallback((menuList: MenuData[]): string[] => {
      const ids: string[] = [];
      const traverse = (items: MenuData[]) => {
        items.forEach((item) => {
          if (item.children && item.children.length > 0) {
            ids.push(item.id.toString());
            traverse(item.children);
          }
        });
      };
      traverse(menuList);
      return ids;
    }, []);

    // 渲染菜单树
    const renderTree = (nodes: MenuData[]) =>
      nodes.map((node) => (
        <TreeItem
          key={node.id}
          itemId={node.id.toString()}
          label={
            <Box display="flex" alignItems="center" py={0.5}>
              <Box
                component="span"
                className={node.icon}
                sx={{ mr: 1, fontSize: 20, display: 'flex', alignItems: 'center' }}
              />
              <Typography sx={{ flexGrow: 1 }}>
                {node.name}
                {node.path && (
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    ({node.path})
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
                  title="添加子菜单"
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
          {node.children && node.children.length > 0 && renderTree(node.children)}
        </TreeItem>
      ));

    return (
      <>
        {/* 菜单树 */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : menus.length > 0 ? (
            <SimpleTreeView
              slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
              defaultExpandedItems={getAllExpandedIds(menus)}
            >
              {renderTree(menus)}
            </SimpleTreeView>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={4}>
              暂无菜单数据，点击上方按钮添加
            </Typography>
          )}
        </Box>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除菜单 "<strong>{menuToDelete?.name}</strong>" 吗？此操作不可恢复。
            </Typography>
            {menuToDelete?.children && menuToDelete.children.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                该菜单存在子菜单，请先删除子菜单后再删除该菜单。
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete} disabled={loading}>
              取消
            </Button>
            <Button
              onClick={confirmDeleteMenu}
              color="error"
              variant="contained"
              disabled={loading || !!(menuToDelete?.children && menuToDelete.children.length > 0)}
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
