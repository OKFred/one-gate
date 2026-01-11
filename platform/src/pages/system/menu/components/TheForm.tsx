import { useState, forwardRef, useImperativeHandle, memo, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import * as MenuAPI from '@/api/system/menu';
import * as RoleAPI from '@/api/system/role';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { showGlobalNotification } from '@/components/Notification';
import hasValue from '@/utils/hasValue';

// 菜单数据接口
export interface MenuFormData {
  id?: number;
  name: string;
  icon: string;
  path: string | null;
  parentId: number | null;
  sort: number;
  roleIdArr: number[];
  isEnabled: boolean;
}

// 菜单菜单类型（简化版）
export interface MenuData {
  id: number;
  name: string;
  icon: string;
  path: string | null;
  parentId: number | null;
  sort: number;
  roleIdArr: number[] | null;
  isEnabled: boolean;
  children?: MenuData[] | null;
}

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开新增表单 */
  openAdd: (parentId?: number) => void;
  /** 打开编辑表单 */
  openEdit: (menu: MenuData) => void;
  /** 关闭表单 */
  close: () => void;
}

const DEFAULT_FORM: MenuFormData = {
  name: '',
  icon: 'material-symbols:folder',
  path: null,
  parentId: null,
  sort: 0,
  roleIdArr: [],
  isEnabled: true,
};

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

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const { treeRef } = localObj;
    const { isMobile } = useResponsive();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuData | null>(null);
    const [formValues, setFormValues] = useState<MenuFormData>(DEFAULT_FORM);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [roleOptions, setRoleOptions] = useState<{ value: number; label: string }[]>([]);
    const [allMenus, setAllMenus] = useState<MenuData[]>([]);

    // 获取角色列表
    const fetchRoles = useCallback(async () => {
      try {
        const res = await RoleAPI.listAllFn({ data: {} });
        const roles = res.data.data || [];
        const options = roles.map((role: { id: number; name: string }) => ({
          value: role.id,
          label: role.name,
        }));
        setRoleOptions(options);
      } catch (error) {
        console.error('获取角色列表失败:', error);
      }
    }, []);

    // 获取所有菜单列表
    const fetchAllMenus = useCallback(async () => {
      try {
        const res = await MenuAPI.listAllFn({ data: {} });
        const menus = res.data.data || [];
        setAllMenus(menus as MenuData[]);
      } catch (error) {
        console.error('获取菜单列表失败:', error);
      }
    }, []);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        openAdd: (parentId?: number) => {
          setEditingMenu(null);
          setFormValues({
            ...DEFAULT_FORM,
            parentId: parentId ?? null,
          });
          setError('');
          setDialogOpen(true);
          fetchRoles();
          fetchAllMenus();
        },
        openEdit: (menu: MenuData) => {
          setEditingMenu(menu);
          setFormValues({
            id: menu.id,
            name: menu.name,
            icon: menu.icon,
            path: menu.path ?? null,
            parentId: menu.parentId ?? null,
            sort: menu.sort ?? 0,
            roleIdArr: menu.roleIdArr || [],
            isEnabled: menu.isEnabled ?? true,
          });
          setError('');
          setDialogOpen(true);
          fetchRoles();
          fetchAllMenus();
        },
        close: () => {
          setDialogOpen(false);
        },
      }),
      [fetchRoles, fetchAllMenus],
    );

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
      if (!formValues.name.trim()) {
        setError('菜单名称不能为空');
        return;
      }

      setLoading(true);
      try {
        const submitData = {
          name: formValues.name,
          icon: formValues.icon || 'material-symbols:folder',
          path: hasValue(formValues.path) ? formValues.path : null,
          parentId: hasValue(formValues.parentId) ? formValues.parentId : null,
          sort: formValues.sort,
          roleIdArr:
            formValues.roleIdArr && formValues.roleIdArr.length > 0 ? formValues.roleIdArr : null,
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

        // 刷新树形结构
        if (treeRef.current) {
          treeRef.current.refresh();
        }

        setDialogOpen(false);
        setFormValues(DEFAULT_FORM);
        setEditingMenu(null);
      } catch (err) {
        console.error(err);
        setError('操作失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    // 关闭对话框
    const handleCloseDialog = () => {
      setDialogOpen(false);
      setEditingMenu(null);
      setError('');
      setFormValues(DEFAULT_FORM);
    };

    return (
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="菜单名称"
              value={formValues.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              fullWidth
              required
            />

            <FormControl fullWidth>
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
              helperText="例如: material-symbols:home"
            />

            <TextField
              label="路由路径"
              value={formValues.path ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFormChange('path', hasValue(value) ? value : null);
              }}
              fullWidth
              helperText="例如: /system/menu"
            />

            <FormControl fullWidth>
              <InputLabel>父菜单</InputLabel>
              <Select
                value={formValues.parentId === null ? '' : formValues.parentId}
                label="父菜单"
                onChange={(e) => {
                  const val = e.target.value as string | number;
                  handleFormChange('parentId', val === '' ? null : Number(val));
                }}
              >
                <MenuItem value="">
                  <em>无 (顶级菜单)</em>
                </MenuItem>
                {allMenus
                  .filter((m) => m.id !== editingMenu?.id)
                  .map((menu) => (
                    <MenuItem key={menu.id} value={menu.id}>
                      {menu.name}
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
              helperText="数字越小越靠前"
            />

            <FormControl fullWidth>
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
            />
          </Stack>
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
    );
  }),
);

TheForm.displayName = 'TheForm';

export default TheForm;
