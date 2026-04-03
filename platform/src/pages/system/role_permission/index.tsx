import { useRef, useMemo, useState, useEffect } from 'react';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheForm, { type TheFormRef } from './components/TheForm';
import TheTree, { type TheTreeRef } from './components/TheTree';
import TheFilter, { type TheFilterRef } from './components/TheFilter';
import TheActionButtons from './components/TheActionButtons';
import * as RolePermissionAPI from '@/api/system/role_permission';
import * as RoleAPI from '@/api/system/role';
import * as PermissionAPI from '@/api/system/permission';
import type {
  ListAllRoleRes,
  ListAllPermissionRes,
  ListRolePermissionRes,
} from '@/api/system/type';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { useResponsive } from '@/hooks/useResponsive';
import { useSearchParams } from 'react-router-dom';

export interface Props {
  localObj: LocalObj;
}
export interface LocalObj {
  tableRef: React.RefObject<TheTreeRef | null>;
  formRef: React.RefObject<TheFormRef | null>;
  filterRef: React.RefObject<TheFilterRef | null>;
  allRoles: ListAllRoleRes;
  allPermissions: ListAllPermissionRes;
  query: {
    roleId?: number;
    [key: string]: string | number | boolean | undefined;
  };
}

export default function RolePermissionManagement() {
  const t = useTranslation();
  const tableRef = useRef<TheTreeRef>(null);
  const formRef = useRef<TheFormRef>(null);
  const filterRef = useRef<TheFilterRef>(null);
  const [allRoles, setAllRoles] = useState<ListAllRoleRes>([]);
  const [allPermissions, setAllPermissions] = useState<ListAllPermissionRes>([]);
  const [selectedRows, setSelectedRows] = useState<NonNullable<ListRolePermissionRes['list']>>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isMobile } = useResponsive();
  const [searchParams] = useSearchParams();
  const query = useMemo(() => {
    const queryObj = {} as { [key: string]: string | number | boolean };
    for (const [key, value] of searchParams.entries()) {
      let finalValue = value as string | number | boolean;
      if (/id/i.test(key)) {
        finalValue = Number(value);
      }
      queryObj[key] = finalValue;
    }
    // console.log('跳转传参：', queryObj);
    return queryObj;
  }, [searchParams]);
  const localObj: LocalObj = useMemo(
    () => ({ tableRef, formRef, filterRef, allRoles, allPermissions, query }),
    [allRoles, allPermissions, query],
  );

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

  // 获取所有权限列表
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await PermissionAPI.listAllFn({ data: {} });
        setAllPermissions(res.data.data || []);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      }
    };
    fetchPermissions();
  }, []);

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) return;

    setDeleting(true);
    try {
      // 按角色分组删除
      const roleGroups: Record<number, number[]> = {};
      selectedRows.forEach((row) => {
        if (!roleGroups[row.roleId]) {
          roleGroups[row.roleId] = [];
        }
        roleGroups[row.roleId].push(row.permissionId);
      });

      // 为每个角色调用批量删除
      for (const [roleId, permissionIds] of Object.entries(roleGroups)) {
        await RolePermissionAPI.batchDeleteFn({
          data: { roleId: Number(roleId), permissionIds },
        });
      }

      setDeleteDialogOpen(false);
      setSelectedRows([]);
      // 刷新表格数据
      tableRef.current?.refresh();
    } catch (error) {
      console.warn(error);
    } finally {
      setDeleting(false);
    }
  };

  // 打开删除确认对话框
  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  // 关闭删除确认对话框
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <PageLayout
        title={t('rolePermission.title')}
        actions={
          <TheActionButtons
            localObj={localObj}
            selectedRows={selectedRows}
            onBatchDelete={openDeleteDialog}
          />
        }
      >
        <TheFilter ref={localObj.filterRef} localObj={localObj} />
        <TheForm ref={localObj.formRef} localObj={localObj} />
        <TheTree
          ref={localObj.tableRef}
          initialRoleId={query.roleId ? Number(query.roleId) : null}
          allPermissions={allPermissions}
          formRef={localObj.formRef}
        />
      </PageLayout>

      {/* 批量删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('rolePermission.confirmBatchDelete').replace(
              '{count}',
              selectedRows.length.toString(),
            )}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('rolePermission.selectedItems')}:
            </Typography>
            {selectedRows.slice(0, 5).map((row) => {
              const role = allRoles.find((r) => r.id === row.roleId);
              const permission = allPermissions.find((p) => p.id === row.permissionId);
              return (
                <Typography key={row.id} variant="body2" sx={{ mt: 0.5 }}>
                  • {role?.name || 'Unknown'} - {permission?.name || 'Unknown'}
                </Typography>
              );
            })}
            {selectedRows.length > 5 && (
              <Typography variant="body2" color="text.secondary">
                {t('rolePermission.andMore').replace(
                  '{count}',
                  (selectedRows.length - 5).toString(),
                )}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleting}>
            {t('dialog.cancel')}
          </Button>
          <Button onClick={handleBatchDelete} color="error" variant="contained" disabled={deleting}>
            {t('dialog.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
