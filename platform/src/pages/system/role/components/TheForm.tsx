import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControlLabel,
  Switch,
  Box,
  useTheme,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as RoleAPI from '@/api/system/role';
import type { AddRoleReq, UpdateRoleReq } from '@/api/system/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';
import hasValue from '@/utils/hasValue';

// 暴露给父组件的方法
export interface RoleFormRef {
  /** 打开编辑表单 */
  onOpen: (role?: TableState['list'][0]) => void;
}

const DEFAULT_FORM: AddRoleReq | UpdateRoleReq = {
  name: '',
  description: null,
  permissions: null,
  isEnabled: true,
};

const TheForm = memo(
  forwardRef<RoleFormRef, Props>(function TheForm({ localObj }, ref) {
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddRoleReq | UpdateRoleReq>(DEFAULT_FORM);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: (role?: TableState['list'][0]) => {
          if (role) {
            setEditId(role.id!);
            setForm({
              name: role.name,
              description: role.description,
              permissions: role.permissions,
              isEnabled: role.isEnabled,
            });
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
      const formData = { ...form };

      if (editId) {
        await RoleAPI.updateFn({ data: { id: editId, ...formData } as UpdateRoleReq });
      } else {
        await RoleAPI.addFn({ data: formData as AddRoleReq });
      }
      handleCancel();
      // 刷新表格数据
      tableRef.current?.refresh();
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
            {editId ? '编辑角色' : '新增角色'}
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
                label="角色名称"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder="例如：管理员、编辑、普通用户"
              />

              <TextField
                label="角色描述"
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: hasValue(e.target.value) ? e.target.value : null,
                  })
                }
                fullWidth
                multiline
                rows={3}
                size={isMobile ? 'medium' : 'medium'}
                placeholder="请输入角色描述"
              />

              <TextField
                label="权限列表"
                value={form.permissions ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    permissions: hasValue(e.target.value) ? e.target.value : null,
                  })
                }
                fullWidth
                multiline
                rows={4}
                size={isMobile ? 'medium' : 'medium'}
                placeholder='JSON数组格式，例如：["user:read","user:write","system:admin"]'
                helperText="权限列表为JSON数组格式"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    disabled={editId === 1}
                  />
                }
                label="启用状态"
              />
            </Stack>
          </form>
        </DialogContent>

        <DialogActions
          sx={{
            px: isMobile ? 2 : 3,
            py: isMobile ? 2 : 1.5,
          }}
        >
          <Button onClick={handleCancel} color="inherit">
            取消
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editId ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheForm.displayName = 'TheForm';

export default TheForm;
