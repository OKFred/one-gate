import { useRef, useState, useEffect, useMemo } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheTree, { type TheTreeRef } from './components/TheTree';
import * as RoleAPI from '@/api/admin/system/role';
import * as RolePermissionAPI from '@/api/admin/system/role_permission';
import type { ListAllRoleRes } from '@/api/admin/system/type';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useSearchParams } from 'react-router-dom';

export default function RolePermissionManagement() {
  const t = useTranslation();
  const treeRef = useRef<TheTreeRef>(null);
  const [allRoles, setAllRoles] = useState<ListAllRoleRes>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [searchParams] = useSearchParams();

  // URL 参数中的初始角色
  const initialRoleId = useMemo(() => {
    const roleIdParam = searchParams.get('roleId');
    return roleIdParam ? Number(roleIdParam) : null;
  }, [searchParams]);

  // 获取所有角色列表
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await RoleAPI.listAllFn({ data: {} });
        setAllRoles(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    };
    fetchRoles();
  }, []);

  // 设置初始角色
  useEffect(() => {
    if (initialRoleId && !selectedRoleId) {
      setSelectedRoleId(initialRoleId);
    }
  }, [initialRoleId, selectedRoleId]);

  // 保存变更
  const handleSave = async () => {
    setConfirmOpen(false);
    if (!selectedRoleId || !treeRef.current) return;

    const { added, removed } = treeRef.current.getChanges();
    if (added.length === 0 && removed.length === 0) return;

    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (added.length > 0) {
        promises.push(
          RolePermissionAPI.batchAddFn({
            data: { roleId: selectedRoleId, permissionIds: added },
          }),
        );
      }

      if (removed.length > 0) {
        promises.push(
          RolePermissionAPI.batchDeleteFn({
            data: { roleId: selectedRoleId, permissionIds: removed },
          }),
        );
      }

      await Promise.all(promises);

      setSnackbar({
        open: true,
        message: t('dialog.operationSuccess'),
        severity: 'success',
      });

      // 重新加载以同步初始状态
      treeRef.current.reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageLayout
        title={t('rolePermission.title')}
        actions={
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => setConfirmOpen(true)}
            disabled={saving || !selectedRoleId || !hasChanges}
            size="small"
          >
            {saving ? t('common.saving') : t('dialog.save')}
          </Button>
        }
      >
        {/* 角色选择器 */}
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('rolePermission.selectRole')}</InputLabel>
            <Select
              value={selectedRoleId || ''}
              onChange={(e) => setSelectedRoleId(e.target.value as number)}
              label={t('rolePermission.selectRole')}
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
        </Box>

        {/* 权限勾选树 */}
        <TheTree ref={treeRef} roleId={selectedRoleId} onChange={setHasChanges} />
      </PageLayout>

      {/* 确认弹窗 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('dialog.confirm')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">{t('dialog.confirmContent')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t('dialog.cancel')}</Button>
          <Button onClick={handleSave} variant="contained" autoFocus>
            {t('dialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 操作反馈 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
