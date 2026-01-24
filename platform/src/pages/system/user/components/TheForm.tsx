import React, { useState, forwardRef, useImperativeHandle, memo, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  OutlinedInput,
  useTheme,
  IconButton,
  Paper,
  Typography,
  Popover,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import * as UserAPI from '@/api/system/user';
import * as RoleAPI from '@/api/system/role';
import * as DepartmentAPI from '@/api/system/department';
import type { AddUserReq, UpdateUserReq, TreeDepartmentRes } from '@/api/system/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';
import { authUtils, type UserInfo } from '@/utils/auth';

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开编辑表单 */
  onOpen: (row?: TableState['list'][0]) => void;
}

const DEFAULT_FORM: AddUserReq | UpdateUserReq = {
  username: '',
  password: '',
  regionObj: null,
  departmentObj: null,
  roleArr: [],
  langCode: '',
  isEnabled: true,
  remark: null,
};

const TheForm = memo(
  forwardRef<TheFormRef, Props>(function TheForm({ localObj }, ref) {
    const t = useTranslation();
    const { tableRef, enabledRegions, enabledLanguages } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddUserReq | UpdateUserReq>(DEFAULT_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const [departmentAnchorEl, setDepartmentAnchorEl] = useState<HTMLDivElement | null>(null);
    const [roleOptions, setRoleOptions] = useState<{ value: number; label: string }[]>([]);
    const [departmentTree, setDepartmentTree] = useState<TreeDepartmentRes>([]);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(false);

    // 加载用户信息
    useEffect(() => {
      const user = authUtils.getUserInfo();
      setUserInfo(user);
    }, []);

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

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: async (row?: TableState['list'][0]) => {
          if (row) {
            const detail = await UserAPI.getFn({ data: { id: row.id! } }).then(
              (res) => res.data.data,
            );
            setEditId(detail.id);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { creatorId, updaterId, createTimeUtc, updateTimeUtc, ...rest } = detail;
            setForm({ ...rest });
          } else {
            setEditId(null);
            setForm(DEFAULT_FORM);
          }
          setShowPassword(false);
          setOpen(true);
        },
      }),
      [],
    );

    const selectedRoleValues = React.useMemo(
      () => form.roleArr?.map((item) => item.value) ?? [],
      [form.roleArr],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
      setShowPassword(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const formData = { ...form };
        // 保证 remark 字段传递（允许为 null）
        if (!('remark' in formData)) {
          formData.remark = null;
        }

        if (editId) {
          // 编辑用户
          const updateData = { id: editId, ...formData };
          await UserAPI.updateFn({
            data: updateData as UpdateUserReq,
          });
        } else {
          // 添加用户
          await UserAPI.addFn({
            data: formData as AddUserReq,
          });
        }
        handleCancel();
        // 刷新表格数据
        tableRef.current?.refresh();
      } catch (error) {
        console.warn(error);
      } finally {
        setLoading(false);
      }
    };

    // 处理角色多选变化
    const handleRoleChange = (event: SelectChangeEvent<number[]>) => {
      const value = event.target.value as number[] | number;
      const roleArr = (Array.isArray(value) ? value : [value]).map((val) => {
        const role = roleOptions.find((r) => r.value === val);
        return role
          ? { value: role.value, label: role.label }
          : { value: Number(val), label: String(val) };
      });
      setForm({
        ...form,
        roleArr,
      });
    };

    const handleDepartmentClick = (event: React.MouseEvent<HTMLDivElement>) => {
      setDepartmentAnchorEl(event.currentTarget);
    };

    const handleDepartmentClose = () => {
      setDepartmentAnchorEl(null);
    };

    const handleDepartmentSelect = (nodeId: number, nodeName: string) => {
      const departmentId = nodeId;
      setForm({
        ...form,
        departmentObj: { value: departmentId, label: nodeName },
      });
      handleDepartmentClose();
    };

    const handleDepartmentClear = () => {
      setForm({ ...form, departmentObj: null });
      handleDepartmentClose();
    };

    const renderTreeItems = (nodes: TreeDepartmentRes): React.ReactNode => {
      return nodes.map((node) => (
        <TreeItem
          key={node.id}
          itemId={String(node.id)}
          label={
            <Box
              onClick={() => handleDepartmentSelect(node.id, node.name)}
              sx={{
                py: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {node.name}
            </Box>
          }
        >
          {node.children && node.children.length > 0
            ? renderTreeItems(node.children as TreeDepartmentRes)
            : null}
        </TreeItem>
      ));
    };

    const departmentPopoverOpen = Boolean(departmentAnchorEl);

    return (
      <Dialog
        open={open}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            margin: isMobile ? 0 : theme.spacing(4),
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: isMobile ? 1 : 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {editId ? t('common.actions.update') : t('common.actions.add')}
          </Box>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleCancel} aria-label="close">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent
          sx={{
            pb: isMobile ? 1 : 2,
            px: isMobile ? 2 : 3,
          }}
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
              <TextField
                label={t('login.username')}
                value={form.username ?? ''}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
              />

              {!editId && (
                <TextField
                  label={t('system.user.form.password')}
                  type={showPassword ? 'text' : 'password'}
                  value={(form as AddUserReq).password ?? ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    },
                  }}
                />
              )}

              <Box>
                <InputLabel sx={{ mb: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {t('me.details.department')}
                </InputLabel>
                <Paper
                  variant="outlined"
                  onClick={handleDepartmentClick}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '56px',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Typography color={form.departmentObj ? 'text.primary' : 'text.secondary'}>
                    {form.departmentObj?.label || t('form.select')}
                  </Typography>
                  <ArrowDropDownIcon color="action" />
                </Paper>

                <Popover
                  open={departmentPopoverOpen}
                  anchorEl={departmentAnchorEl}
                  onClose={handleDepartmentClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  slotProps={{
                    paper: {
                      sx: {
                        width: departmentAnchorEl?.offsetWidth || 300,
                        maxHeight: 400,
                        mt: 1,
                      },
                    },
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2">{t('form.select')}</Typography>
                      {form.departmentObj && (
                        <Button size="small" onClick={handleDepartmentClear}>
                          {t('common.clear')}
                        </Button>
                      )}
                    </Box>
                    {departmentTree.length > 0 ? (
                      <SimpleTreeView>{renderTreeItems(departmentTree)}</SimpleTreeView>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        {t('common.noData')}
                      </Typography>
                    )}
                  </Box>
                </Popover>
              </Box>

              <FormControl fullWidth size={isMobile ? 'medium' : 'medium'}>
                <InputLabel>{t('me.details.region')}</InputLabel>
                <Select
                  value={form.regionObj?.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const region = enabledRegions.find((r) => r.id === value);
                      setForm({
                        ...form,
                        regionObj: region
                          ? {
                              value: region.id,
                              label: region.alpha2Code || '',
                            }
                          : null,
                      });
                    } else {
                      setForm({ ...form, regionObj: null });
                    }
                  }}
                  label={t('me.details.region')}
                >
                  <MenuItem value="">
                    <em>{t('form.select')}</em>
                  </MenuItem>
                  {enabledRegions.map((region) => {
                    const labels = region.labels as Record<string, string> | undefined;
                    const displayName =
                      labels?.[userInfo?.langCode || ''] || region.alpha2Code || '';
                    return (
                      <MenuItem key={region.id} value={region.id}>
                        {displayName} ({region.alpha2Code})
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth size={isMobile ? 'medium' : 'medium'}>
                <InputLabel>{t('common.language')}</InputLabel>
                <Select
                  value={form.langCode || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm({ ...form, langCode: value || '' });
                  }}
                  label={t('common.language')}
                >
                  <MenuItem value="">
                    <em>{t('form.select')}</em>
                  </MenuItem>
                  {enabledLanguages.map((language) => (
                    <MenuItem key={language.langCode} value={language.langCode}>
                      {language.nativeName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required size={isMobile ? 'medium' : 'medium'}>
                <InputLabel>{t('menu.system.role')}</InputLabel>
                <Select
                  multiple
                  value={selectedRoleValues}
                  onChange={handleRoleChange}
                  input={<OutlinedInput label={t('menu.system.role')} />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const label =
                          roleOptions.find((r) => r.value === value)?.label ||
                          form.roleArr?.find((r) => r.value === value)?.label ||
                          value;
                        return <Chip key={value} label={label} size="small" />;
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

              <FormControlLabel
                control={
                  <Switch
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    disabled={editId === 1}
                  />
                }
                label={t('common.status.enabled')}
              />

              <TextField
                label={t('common.form.remark')}
                value={form.remark ?? ''}
                onChange={(e) =>
                  setForm({ ...form, remark: e.target.value ? e.target.value : null })
                }
                fullWidth
                multiline
                rows={3}
                size={isMobile ? 'medium' : 'medium'}
                inputProps={{ maxLength: 500 }}
                helperText={`${(form.remark || '').length}/500`}
              />
            </Stack>
          </form>
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
            onClick={handleCancel}
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

export default TheForm;
