import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  IconButton,
  Typography,
  Alert,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import * as MenuAPI from '@/api/system/menu';
import { showGlobalNotification } from '@/utils/notification';
import { PageLayout } from '@/layout/responsive';

// 菜单接口 (从tree接口返回的数据，部分字段可选)
interface Menu {
  id: number;
  text: string;
  icon: string;
  path?: string | null;
  parentId?: number | null;
  sort?: number;
  roleIdArr?: number[];
  isEnabled?: boolean;
  children?: Menu[];
}

// 表单数据类型
interface MenuFormData {
  text: string;
  icon: string;
  path: string;
  parentId: number | null;
  sort: number;
  roleIdArr: number[];
  isEnabled: boolean;
}

// 默认表单数据
const defaultFormData: MenuFormData = {
  text: '',
  icon: 'material-symbols:folder',
  path: '',
  parentId: null,
  sort: 0,
  roleIdArr: [],
  isEnabled: true,
};

// 预定义的角色选项
const roleOptions = [
  { value: 1, label: '超级管理员' },
  { value: 2, label: '管理员' },
  { value: 3, label: '普通用户' },
];

// 常用图标选项
const iconOptions = [
  { value: 'material-symbols:home', label: '首页' },
  { value: 'material-symbols:dashboard', label: '仪表盘' },
  { value: 'material-symbols:settings', label: '设置' },
  { value: 'material-symbols:person', label: '用户' },
  { value: 'material-symbols:group', label: '团队' },
  { value: 'material-symbols:folder', label: '文件夹' },
  { value: 'material-symbols:mail', label: '邮件' },
  { value: 'material-symbols:article', label: '文章' },
  { value: 'material-symbols:analytics', label: '分析' },
  { value: 'material-symbols:inventory', label: '库存' },
  { value: 'material-symbols:shopping-cart', label: '购物车' },
  { value: 'material-symbols:calendar-month', label: '日历' },
  { value: 'material-symbols:menu', label: '菜单' },
  { value: 'material-symbols:apartment', label: '部门' },
  { value: 'material-symbols:security', label: '安全' },
];

export default function MenuManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [menus, setMenus] = useState<Menu[]>([]);
  const [flatMenus, setFlatMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAll, setShowAll] = useState<boolean>(true);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formValues, setFormValues] = useState<MenuFormData>(defaultFormData);
  const [error, setError] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);

  // 将树形结构展平
  const flattenMenus = useCallback((menuList: Menu[]): Menu[] => {
    const result: Menu[] = [];
    const traverse = (items: Menu[]) => {
      items.forEach((item) => {
        result.push(item);
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    traverse(menuList);
    return result;
  }, []);

  // 获取菜单树
  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const params = { showAll };
      const res = await MenuAPI.treeFn({ data: params });
      const treeData = res.data.data || [];
      setMenus(treeData);
      setFlatMenus(flattenMenus(treeData));
    } catch (err) {
      console.error(err);
      showGlobalNotification({ message: '获取菜单列表失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [flattenMenus, showAll]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // 打开对话框
  const handleOpenDialog = (menu?: Menu, parentId?: number) => {
    if (menu) {
      // 编辑模式
      setEditingMenu(menu);
      setFormValues({
        text: menu.text,
        icon: menu.icon,
        path: menu.path || '',
        parentId: menu.parentId ?? null,
        sort: menu.sort ?? 0,
        roleIdArr: menu.roleIdArr || [],
        isEnabled: menu.isEnabled ?? true,
      });
    } else {
      // 添加模式
      setEditingMenu(null);
      setFormValues({
        ...defaultFormData,
        parentId: parentId ?? null,
      });
    }
    setDialogOpen(true);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMenu(null);
    setError('');
    setFormValues(defaultFormData);
  };

  // 处理表单变化
  const handleFormChange = (
    field: keyof MenuFormData,
    value: string | number | number[] | boolean | null,
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  // 处理角色多选变化
  const handleRoleChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    handleFormChange('roleIdArr', typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formValues.text) {
      setError('菜单名称不能为空');
      return;
    }
    if (!formValues.icon) {
      formValues.icon = 'material-symbols:folder';
    }

    setLoading(true);
    try {
      const submitData = {
        text: formValues.text,
        icon: formValues.icon,
        path: formValues.path || null,
        parentId: formValues.parentId,
        sort: formValues.sort,
        roleIdArr: formValues.roleIdArr,
        isEnabled: formValues.isEnabled,
      };

      if (editingMenu) {
        await MenuAPI.updateFn({
          data: {
            id: editingMenu.id,
            ...submitData,
          },
        });
        showGlobalNotification({ message: '菜单更新成功', type: 'success' });
      } else {
        await MenuAPI.addFn({
          data: submitData,
        });
        showGlobalNotification({ message: '菜单添加成功', type: 'success' });
      }
      fetchMenus();
      handleCloseDialog();
    } catch (err) {
      console.error(err);
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 删除菜单
  const handleDelete = (menu: Menu) => {
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

  // 渲染菜单树
  const renderTree = (nodes: Menu[]) =>
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
              {node.text}
              {node.path && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({node.path})
                </Typography>
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog(undefined, node.id);
                }}
                title="添加子菜单"
              >
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDialog(node);
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
                disabled={node.children && node.children.length > 0}
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

  // 获取所有展开项的ID
  const getAllExpandedIds = useCallback((menuList: Menu[]): string[] => {
    const ids: string[] = [];
    const traverse = (items: Menu[]) => {
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

  return (
    <PageLayout
      title="菜单管理"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>启用状态</InputLabel>
            <Select<string>
              value={showAll === true ? 'all' : 'enabled'}
              label="启用状态"
              onChange={(e) => {
                const val = e.target.value;
                setShowAll(val === 'all' ? true : false);
              }}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="enabled">仅启用</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            添加菜单
          </Button>
        </Box>
      }
    >
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

      {/* 添加/编辑对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{editingMenu ? '编辑菜单' : '添加菜单'}</span>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="菜单名称"
            value={formValues.text}
            onChange={(e) => handleFormChange('text', e.target.value)}
            fullWidth
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>图标</InputLabel>
            <Select
              value={formValues.icon}
              label="图标"
              onChange={(e) => handleFormChange('icon', e.target.value)}
            >
              {iconOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box component="span" className={opt.value} sx={{ fontSize: 20 }} />
                    {opt.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="自定义图标 (Iconify格式)"
            value={formValues.icon}
            onChange={(e) => handleFormChange('icon', e.target.value)}
            fullWidth
            margin="normal"
            helperText="例如: material-symbols:home"
          />

          <TextField
            label="路由路径"
            value={formValues.path}
            onChange={(e) => handleFormChange('path', e.target.value)}
            fullWidth
            margin="normal"
            helperText="例如: /system/menu"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>父菜单</InputLabel>
            <Select<number | ''>
              value={formValues.parentId ?? ''}
              label="父菜单"
              onChange={(e) => {
                const val = e.target.value;
                handleFormChange('parentId', val === '' ? null : Number(val));
              }}
            >
              <MenuItem value="">
                <em>无 (顶级菜单)</em>
              </MenuItem>
              {flatMenus
                .filter((m) => m.id !== editingMenu?.id)
                .map((menu) => (
                  <MenuItem key={menu.id} value={menu.id}>
                    {menu.text}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            label="排序"
            type="number"
            value={formValues.sort}
            onChange={(e) => handleFormChange('sort', parseInt(e.target.value, 10) || 0)}
            fullWidth
            margin="normal"
            helperText="数字越小越靠前"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>可见角色</InputLabel>
            <Select
              multiple
              value={formValues.roleIdArr}
              onChange={handleRoleChange}
              input={<OutlinedInput label="可见角色" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const role = roleOptions.find((r) => r.value === value);
                    return <Chip key={value} label={role?.label || value} size="small" />;
                  })}
                </Box>
              )}
            >
              {roleOptions.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            留空表示所有角色可见
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={formValues.isEnabled}
                onChange={(e) => handleFormChange('isEnabled', e.target.checked)}
              />
            }
            label="启用状态"
            sx={{ mt: 2, display: 'block' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除菜单 "<strong>{menuToDelete?.text}</strong>" 吗？此操作不可恢复。
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
            disabled={loading || (menuToDelete?.children && menuToDelete.children.length > 0)}
          >
            {loading ? <CircularProgress size={20} /> : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
