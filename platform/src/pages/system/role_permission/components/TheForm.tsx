import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Chip,
  useTheme,
  Paper,
  Divider,
  List,
  ListItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as RolePermissionAPI from '@/api/system/role_permission';
import type {
  BatchAddRolePermissionReq,
  UpdateRolePermissionReq,
  GetPermissionsByRoleRes,
  ListRolePermissionRes,
} from '@/api/system/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开批量添加权限表单 */
  onBatchAdd: () => void;
  /** 打开编辑表单 */
  onOpen: (row?: NonNullable<ListRolePermissionRes['list']>[0]) => void;
}

const TheForm = memo(
  forwardRef<TheFormRef, Props>(function TheForm({ localObj }, ref) {
    const t = useTranslation();
    const { tableRef, allRoles, allPermissions } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
    const [resourceFilter, setResourceFilter] = useState('');
    const [conditions, setConditions] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentRolePermissions, setCurrentRolePermissions] = useState<GetPermissionsByRoleRes>(
      [],
    );

    // 获取角色的当前权限
    const fetchRolePermissions = async (roleId: number) => {
      try {
        const res = await RolePermissionAPI.getPermissionsByRoleFn({ data: { roleId } });
        setCurrentRolePermissions(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch role permissions:', error);
        setCurrentRolePermissions([]);
      }
    };

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onBatchAdd: () => {
          setIsBatchMode(true);
          setEditId(null);
          setSelectedRoleId(null);
          setSelectedPermissionIds([]);
          setResourceFilter('');
          setConditions('');
          setCurrentRolePermissions([]);
          setOpen(true);
        },
        onOpen: async (row?: NonNullable<ListRolePermissionRes['list']>[0]) => {
          setIsBatchMode(false);
          if (row) {
            setEditId(row.id);
            setSelectedRoleId(row.roleId);
            setSelectedPermissionIds([row.permissionId]);
            setResourceFilter(row.resourceFilter || '');
            setConditions(row.conditions || '');
            await fetchRolePermissions(row.roleId);
          } else {
            setEditId(null);
            setSelectedRoleId(null);
            setSelectedPermissionIds([]);
            setResourceFilter('');
            setConditions('');
            setCurrentRolePermissions([]);
          }
          setOpen(true);
        },
      }),
      [],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setIsBatchMode(false);
      setSelectedRoleId(null);
      setSelectedPermissionIds([]);
      setResourceFilter('');
      setConditions('');
      setCurrentRolePermissions([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRoleId || selectedPermissionIds.length === 0) return;

      setLoading(true);

      try {
        if (isBatchMode) {
          // 批量添加权限到角色
          const batchData: BatchAddRolePermissionReq = {
            roleId: selectedRoleId,
            permissionIds: selectedPermissionIds,
          };
          await RolePermissionAPI.batchAddFn({ data: batchData });
        } else if (editId) {
          // 更新单个角色权限关联
          const updateData: UpdateRolePermissionReq = {
            id: editId,
            resourceFilter: resourceFilter || null,
            conditions: conditions || null,
          };
          await RolePermissionAPI.updateFn({ data: updateData });
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

    // 处理角色选择变化
    const handleRoleChange = (event: SelectChangeEvent<number>) => {
      const roleId = event.target.value as number;
      setSelectedRoleId(roleId);
      setSelectedPermissionIds([]);
      if (roleId) {
        fetchRolePermissions(roleId);
      } else {
        setCurrentRolePermissions([]);
      }
    };

    // 处理权限选择变化
    const handlePermissionToggle = (permissionId: number) => {
      setSelectedPermissionIds((prev) =>
        prev.includes(permissionId)
          ? prev.filter((id) => id !== permissionId)
          : [...prev, permissionId],
      );
    };

    // 处理 category 全选
    const handleCategorySelectAll = (
      _: string,
      businessMap: Record<string, typeof availablePermissions>,
    ) => {
      const allPermissionsInCategory = Object.values(businessMap).flat();
      const categoryPermissionIds = allPermissionsInCategory.map((p) => p.id);
      const isAllSelected = categoryPermissionIds.every((id) => selectedPermissionIds.includes(id));

      setSelectedPermissionIds((prev) => {
        if (isAllSelected) {
          return prev.filter((id) => !categoryPermissionIds.includes(id));
        } else {
          const newIds = new Set(prev);
          categoryPermissionIds.forEach((id) => newIds.add(id));
          return Array.from(newIds);
        }
      });
    };

    // 处理 business 全选
    const handleBusinessSelectAll = (perms: typeof availablePermissions) => {
      const businessPermissionIds = perms.map((p) => p.id);
      const isAllSelected = businessPermissionIds.every((id) => selectedPermissionIds.includes(id));

      setSelectedPermissionIds((prev) => {
        if (isAllSelected) {
          return prev.filter((id) => !businessPermissionIds.includes(id));
        } else {
          const newIds = new Set(prev);
          businessPermissionIds.forEach((id) => newIds.add(id));
          return Array.from(newIds);
        }
      });
    };

    // 检查 category 是否全选
    const isCategoryAllSelected = (
      _: string,
      businessMap: Record<string, typeof availablePermissions>,
    ) => {
      const allPermissionsInCategory = Object.values(businessMap).flat();
      const categoryPermissionIds = allPermissionsInCategory.map((p) => p.id);
      return (
        categoryPermissionIds.length > 0 &&
        categoryPermissionIds.every((id) => selectedPermissionIds.includes(id))
      );
    };

    // 检查 business 是否全选
    const isBusinessAllSelected = (perms: typeof availablePermissions) => {
      const businessPermissionIds = perms.map((p) => p.id);
      return (
        businessPermissionIds.length > 0 &&
        businessPermissionIds.every((id) => selectedPermissionIds.includes(id))
      );
    };

    // 获取未分配给角色的权限
    const getAvailablePermissions = () => {
      if (!selectedRoleId) return allPermissions;
      const assignedPermissionIds = currentRolePermissions.map((rp) => rp.id);
      return allPermissions.filter((p) => !assignedPermissionIds.includes(p.id));
    };

    const availablePermissions = getAvailablePermissions();

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
            {isBatchMode
              ? t('rolePermission.batchAdd')
              : editId
                ? t('dialog.edit')
                : t('dialog.add')}
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
              <FormControl fullWidth required size={isMobile ? 'medium' : 'medium'}>
                <InputLabel>{t('rolePermission.selectRole')}</InputLabel>
                <Select
                  value={selectedRoleId || ''}
                  onChange={handleRoleChange}
                  label={t('rolePermission.selectRole')}
                  disabled={!isBatchMode && !!editId} // 编辑模式下不允许更改角色
                >
                  <MenuItem value="">
                    <em>{t('form.select')}</em>
                  </MenuItem>
                  {allRoles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedRoleId && (
                <>
                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    {isBatchMode
                      ? t('rolePermission.selectPermissions')
                      : t('rolePermission.currentPermissions')}
                  </Typography>

                  {isBatchMode ? (
                    // 批量添加模式：显示可用权限列表（按类别和业务分组，树状结构）
                    <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                      {availablePermissions.length > 0 ? (
                        (() => {
                          // 按 category 和 business 进行二级分组
                          const groupedPermissions = availablePermissions.reduce(
                            (acc, permission) => {
                              const category =
                                permission.category || t('rolePermission.otherCategory');
                              const business = permission.business || 'default';
                              if (!acc[category]) acc[category] = {};
                              if (!acc[category][business]) acc[category][business] = [];
                              acc[category][business].push(permission);
                              return acc;
                            },
                            {} as Record<string, Record<string, typeof availablePermissions>>,
                          );

                          return Object.entries(groupedPermissions).map(
                            ([category, businessMap], categoryIndex) => (
                              <Box key={category} sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Checkbox
                                    size="small"
                                    checked={isCategoryAllSelected(category, businessMap)}
                                    onChange={() => handleCategorySelectAll(category, businessMap)}
                                  />
                                  <Chip
                                    label={t('permission.category.' + category)}
                                    sx={{ fontWeight: 'bold' }}
                                    color={
                                      (
                                        [
                                          'primary',
                                          'secondary',
                                          'info',
                                          'success',
                                          'warning',
                                          'error',
                                        ] as const
                                      )[categoryIndex % 6]
                                    }
                                  />
                                </Box>
                                <Box sx={{ pl: 2 }}>
                                  {Object.entries(businessMap).map(([business, perms]) => (
                                    <Box key={`${category}-${business}`} sx={{ mb: 1.5 }}>
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1,
                                          mb: 1,
                                        }}
                                      >
                                        <Checkbox
                                          size="small"
                                          checked={isBusinessAllSelected(perms)}
                                          onChange={() => handleBusinessSelectAll(perms)}
                                        />
                                        <Chip
                                          label={t('businessType.' + business)}
                                          size="small"
                                          variant="outlined"
                                        />
                                      </Box>
                                      <List dense sx={{ pl: 2 }}>
                                        {perms.map((permission) => (
                                          <ListItem key={permission.id} disablePadding>
                                            <FormControlLabel
                                              control={
                                                <Checkbox
                                                  checked={selectedPermissionIds.includes(
                                                    permission.id,
                                                  )}
                                                  onChange={() =>
                                                    handlePermissionToggle(permission.id)
                                                  }
                                                  size="small"
                                                />
                                              }
                                              label={`${permission.name} (${permission.code})`}
                                              sx={{ width: '100%' }}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            ),
                          );
                        })()
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('rolePermission.noAvailablePermissions')}
                        </Typography>
                      )}
                    </Paper>
                  ) : (
                    // 编辑模式：显示当前权限（按 category 和 business 分组，树状结构）
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      {currentRolePermissions.length > 0 ? (
                        (() => {
                          // 按 category 和 business 进行二级分组
                          const groupedPermissions = currentRolePermissions.reduce(
                            (acc, rp) => {
                              const permission = allPermissions.find((p) => p.id === rp.id);
                              const category =
                                permission?.category || t('rolePermission.otherCategory');
                              const business = permission?.business || 'default';
                              if (!acc[category]) acc[category] = {};
                              if (!acc[category][business]) acc[category][business] = [];
                              acc[category][business].push(rp);
                              return acc;
                            },
                            {} as Record<string, Record<string, typeof currentRolePermissions>>,
                          );

                          return Object.entries(groupedPermissions).map(
                            ([category, businessMap], categoryIndex) => (
                              <Box key={category} sx={{ mb: 2 }}>
                                <Chip
                                  label={t('permission.category.' + category)}
                                  sx={{ mb: 1, fontWeight: 'bold' }}
                                  color={
                                    (
                                      [
                                        'primary',
                                        'secondary',
                                        'info',
                                        'success',
                                        'warning',
                                        'error',
                                      ] as const
                                    )[categoryIndex % 6]
                                  }
                                />
                                <Box sx={{ pl: 2 }}>
                                  {Object.entries(businessMap).map(([business, perms]) => (
                                    <Box key={`${category}-${business}`} sx={{ mb: 1.5 }}>
                                      <Chip
                                        label={t('businessType.' + business)}
                                        size="small"
                                        variant="outlined"
                                        sx={{ mb: 1 }}
                                      />
                                      <Box
                                        sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 2 }}
                                      >
                                        {perms.map((rp) => {
                                          const permission = allPermissions.find(
                                            (p) => p.id === rp.id,
                                          );
                                          return (
                                            <Chip
                                              key={rp.id}
                                              label={
                                                permission
                                                  ? `${permission.name} (${permission.code})`
                                                  : 'Unknown'
                                              }
                                              size="small"
                                            />
                                          );
                                        })}
                                      </Box>
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            ),
                          );
                        })()
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('rolePermission.noPermissions')}
                        </Typography>
                      )}
                    </Paper>
                  )}

                  {!isBatchMode && editId && (
                    <>
                      <Divider sx={{ my: 2 }} />

                      <Typography variant="h6" gutterBottom>
                        {t('rolePermission.advancedSettings')}
                      </Typography>

                      <TextField
                        label={t('rolePermission.resourceFilter')}
                        value={resourceFilter}
                        onChange={(e) => setResourceFilter(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        size={isMobile ? 'medium' : 'medium'}
                        placeholder='{"userId": "${currentUser.id}"}'
                        helperText={t('rolePermission.resourceFilterHelp')}
                      />

                      <TextField
                        label={t('rolePermission.conditions')}
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        size={isMobile ? 'medium' : 'medium'}
                        placeholder='{"ipRange": ["192.168.1.0/24"]}'
                        helperText={t('rolePermission.conditionsHelp')}
                      />
                    </>
                  )}
                </>
              )}
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
            variant="outlined"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('dialog.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={
              loading || !selectedRoleId || (isBatchMode && selectedPermissionIds.length === 0)
            }
          >
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
