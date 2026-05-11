import React, { useState, forwardRef, useImperativeHandle, memo, useMemo } from 'react';
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
  Paper,
  Typography,
  Popover,
  IconButton,
  useTheme,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Close as CloseIcon, ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import * as PermissionAPI from '@/api/system/permission';
import type {
  AddPermissionReq,
  UpdatePermissionReq,
  ListAllPermissionRes,
} from '@/api/system/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开编辑表单 */
  onOpen: (row?: TableState['list'][0]) => void;
}

const DEFAULT_FORM: AddPermissionReq | UpdatePermissionReq = {
  code: '',
  name: '',
  category: 'action',
  resource: '',
  business: null,
  remark: null,
  isEnabled: true,
};

const TheForm = memo(
  forwardRef<TheFormRef, Props>(function TheForm({ localObj }, ref) {
    const t = useTranslation();
    const { tableRef, allPermissions } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddPermissionReq | UpdatePermissionReq>(DEFAULT_FORM);
    const [parentAnchorEl, setParentAnchorEl] = useState<HTMLDivElement | null>(null);
    const [loading, setLoading] = useState(false);
    const PERMISSION_TYPES = useMemo(
      () => [{ value: 'action', label: t('permission.category.action') }],
      [t],
    );

    // 构建权限树结构
    type PermissionNode = ListAllPermissionRes[number] & { children: PermissionNode[] };

    const buildPermissionTree = (permissions: ListAllPermissionRes): PermissionNode[] => {
      const map = new Map<string, PermissionNode>();
      const roots: PermissionNode[] = [];

      permissions.forEach((perm) => {
        map.set(perm.business!, { ...perm, children: [] });
      });

      permissions.forEach((perm) => {
        const node = map.get(perm.business!)!;
        if (perm.business && map.has(perm.business)) {
          map.get(perm.business)!.children.push(node);
        } else {
          roots.push(node);
        }
      });

      return roots;
    };

    const permissionTree = React.useMemo(
      () => buildPermissionTree(allPermissions),
      [allPermissions],
    );

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: async (row?: TableState['list'][0]) => {
          if (row) {
            const detail = await PermissionAPI.getFn({ data: { id: row.id! } }).then(
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
          setOpen(true);
        },
      }),
      [],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
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
          // 编辑权限
          const updateData = { id: editId, ...formData };
          await PermissionAPI.updateFn({
            data: updateData as UpdatePermissionReq,
          });
        } else {
          // 添加权限
          await PermissionAPI.addFn({
            data: formData as AddPermissionReq,
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

    const handleParentClick = (event: React.MouseEvent<HTMLDivElement>) => {
      setParentAnchorEl(event.currentTarget);
    };

    const handleParentClose = () => {
      setParentAnchorEl(null);
    };

    const handleParentSelect = (business: string) => {
      setForm({
        ...form,
        business,
      });
      handleParentClose();
    };

    const renderTreeItems = (nodes: PermissionNode[]): React.ReactNode => {
      return nodes.map((node) => (
        <TreeItem
          key={node.id}
          itemId={node.business!}
          label={
            <Box
              onClick={() => handleParentSelect(node.business!)}
              sx={{
                py: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {node.name} ({node.code})
            </Box>
          }
        >
          {node.children && node.children.length > 0 ? renderTreeItems(node.children) : null}
        </TreeItem>
      ));
    };

    const parentPopoverOpen = Boolean(parentAnchorEl);

    const getParentName = () => {
      if (!form.business) return t('form.select');
      const parent = allPermissions.find((p) => p.business === form.business);
      return parent ? `${parent.name} (${parent.code})` : t('form.select');
    };

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
            {editId ? t('dialog.edit') : t('dialog.add')}
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
                label={t('permission.code')}
                value={form.code ?? ''}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
              />

              <TextField
                label={t('permission.name')}
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
              />

              <FormControl fullWidth required size={isMobile ? 'medium' : 'medium'}>
                <InputLabel>{t('permission.category')}</InputLabel>
                <Select
                  value={form.category || ''}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  label={t('permission.category')}
                >
                  {PERMISSION_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label={t('permission.resource')}
                value={form.resource ?? ''}
                onChange={(e) => setForm({ ...form, resource: e.target.value })}
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder="/api/example"
              />

              <Box>
                <InputLabel sx={{ mb: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                  {t('permission.business')}
                </InputLabel>
                <Paper
                  variant="outlined"
                  onClick={handleParentClick}
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
                  <Typography color={form.business ? 'text.primary' : 'text.secondary'}>
                    {getParentName()}
                  </Typography>
                  <ArrowDropDownIcon color="action" />
                </Paper>

                <Popover
                  open={parentPopoverOpen}
                  anchorEl={parentAnchorEl}
                  onClose={handleParentClose}
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
                        width: parentAnchorEl?.offsetWidth || 300,
                        maxHeight: 400,
                        mt: 1,
                      },
                    },
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    {permissionTree.length > 0 ? (
                      <SimpleTreeView>
                        <TreeItem
                          itemId="root"
                          label={
                            <Box
                              onClick={() => {
                                setForm({ ...form, business: null });
                                handleParentClose();
                              }}
                              sx={{
                                py: 1,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                            >
                              {t('form.select')}
                            </Box>
                          }
                        />
                        {renderTreeItems(permissionTree)}
                      </SimpleTreeView>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        {t('column.noData')}
                      </Typography>
                    )}
                  </Box>
                </Popover>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                  />
                }
                label={t('status.enabled')}
              />

              <TextField
                label={t('column.remark')}
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
            disabled={loading}
          >
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
