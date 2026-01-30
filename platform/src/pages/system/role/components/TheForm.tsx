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
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface RoleFormRef {
  /** 打开编辑表单 */
  onOpen: (role?: TableState['list'][0]) => void;
}

const DEFAULT_FORM: AddRoleReq = {
  name: '',
  remark: null,
  isEnabled: true,
  permissionCount: 0,
};

const TheForm = memo(
  forwardRef<RoleFormRef, Props>(function TheForm({ localObj }, ref) {
    const t = useTranslation();
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddRoleReq | UpdateRoleReq>(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: (role?: TableState['list'][0]) => {
          if (role) {
            setEditId(role.id!);
            setForm({
              name: role.name,
              remark: role.remark ?? null,
              isEnabled: role.isEnabled,
              permissionCount: role.permissionCount || 0,
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
      setLoading(true);

      try {
        const formData = { ...form };

        if (editId) {
          await RoleAPI.updateFn({ data: { id: editId, ...formData } as UpdateRoleReq });
        } else {
          await RoleAPI.addFn({ data: formData as AddRoleReq });
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
                label={t('role.table.roleName')}
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder={t('form.pleaseEnter')}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    disabled={editId === 1}
                  />
                }
                label={t('status.enabled')}
              />

              <TextField
                label={t('column.remark')}
                value={form.remark ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    remark: hasValue(e.target.value) ? e.target.value : null,
                  })
                }
                fullWidth
                multiline
                rows={3}
                size={isMobile ? 'medium' : 'medium'}
                placeholder={t('form.pleaseEnter')}
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

TheForm.displayName = 'TheForm';

export default TheForm;
