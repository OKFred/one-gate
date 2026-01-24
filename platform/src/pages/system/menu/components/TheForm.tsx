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
import { Close as CloseIcon } from '@mui/icons-material';
import * as MenuAPI from '@/api/system/menu';
import * as RoleAPI from '@/api/system/role';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { showSnackbar } from '@/components/Notification';
import hasValue from '@/utils/hasValue';
import { useTranslation } from '@/hooks/useTranslation';

// 菜单数据接口
export interface MenuFormData {
  id?: number;
  name: string;
  icon: string;
  path: string | null;
  remark: string | null;
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
  remark: null,
  parentId: null,
  sort: 0,
  roleIdArr: [],
  isEnabled: true,
};

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
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
            remark: null,
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
      handleFormChange(
        'roleIdArr',
        typeof value === 'string' ? value.split(',').map(Number) : value,
      );
    };

    // 提交表单
    const handleSubmit = async () => {
      if (!formValues.name.trim()) {
        setError(t('system.menu.form.menuNameRequired'));
        return;
      }

      setLoading(true);
      try {
        const submitData = {
          name: formValues.name,
          icon: formValues.icon || 'material-symbols:folder',
          path: hasValue(formValues.path) ? formValues.path : null,
          remark: hasValue(formValues.remark) ? formValues.remark : null,
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
          showSnackbar({
            message: t('common.interact.operationSuccess'),
            type: 'success',
          });
        } else {
          await MenuAPI.addFn({
            data: submitData,
          });
          showSnackbar({
            message: t('common.interact.operationSuccess'),
            type: 'success',
          });
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
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{editingMenu ? t('common.actions.edit') : t('common.actions.add')}</span>
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
              label={t('system.menu.form.menuName')}
              value={formValues.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              fullWidth
              required
            />

            <TextField
              label={t('system.menu.form.customIcon')}
              value={formValues.icon}
              onChange={(e) => handleFormChange('icon', e.target.value)}
              fullWidth
              helperText={t('system.menu.form.iconHelper')}
            />

            <TextField
              label={t('system.menu.form.routePath')}
              value={formValues.path ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFormChange('path', hasValue(value) ? value : null);
              }}
              fullWidth
              helperText={t('system.menu.form.pathHelper')}
            />

            <FormControl fullWidth>
              <InputLabel>{t('system.menu.form.parentMenu')}</InputLabel>
              <Select
                value={formValues.parentId === null ? '' : formValues.parentId}
                label={t('system.menu.form.parentMenu')}
                onChange={(e) => {
                  const val = e.target.value as string | number;
                  handleFormChange('parentId', val === '' ? null : Number(val));
                }}
              >
                <MenuItem value="">
                  <em>{t('system.menu.form.topLevelMenu')}</em>
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
              label={t('system.menu.form.sort')}
              type="number"
              value={formValues.sort}
              onChange={(e) => handleFormChange('sort', parseInt(e.target.value, 10) || 0)}
              fullWidth
              helperText={t('system.menu.form.sortHelper')}
            />

            <FormControl fullWidth>
              <InputLabel>{t('system.menu.form.visibleRoles')}</InputLabel>
              <Select
                multiple
                value={formValues.roleIdArr}
                onChange={handleRoleChange}
                input={<OutlinedInput label={t('system.menu.form.visibleRoles')} />}
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
              {t('system.menu.form.allRolesVisible')}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formValues.isEnabled}
                  onChange={(e) => handleFormChange('isEnabled', e.target.checked)}
                />
              }
              label={t('common.filter.enabledStatus')}
            />
            <TextField
              label={t('common.form.remark')}
              value={formValues.remark ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFormChange('remark', hasValue(value) ? value : null);
              }}
              fullWidth
              multiline
              rows={2}
              inputProps={{ maxLength: 500 }}
              helperText={`${(formValues.remark || '').length}/500`}
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: isMobile ? 2 : 3,
            py: isMobile ? 2 : 2,
            flexDirection: isMobile ? 'column-reverse' : 'row',
            gap: isMobile ? 1 : 0,
          }}
        >
          <Button
            onClick={handleCloseDialog}
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('common.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheForm.displayName = 'TheForm';

export default TheForm;
