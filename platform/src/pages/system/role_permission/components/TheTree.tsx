import { useEffect, useState, useMemo, memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Box, CircularProgress, Typography, Chip, Alert } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import LabelIcon from '@mui/icons-material/Label';
import KeyIcon from '@mui/icons-material/Key';
import * as RolePermissionAPI from '@/api/system/role_permission';
import type { ListAllPermissionRes, ListAllRolePermissionRes } from '@/api/system/type';
import { RolePermissionActionButtons } from './TheActionButtons';
import type { TheFormRef } from './TheForm';
import type { FilterState } from './TheTable';

// 权限分类标签颜色
const CATEGORY_COLOR: Record<
  string,
  'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'
> = {
  menu: 'primary',
  button: 'success',
  api: 'warning',
};

// 树节点类型
interface PermissionLeaf {
  id: number;
  code: string;
  name: string;
  category: string;
  business: string | null | undefined;
  resource: string | null | undefined;
  rolePermissionId: number;
}

interface BusinessNode {
  business: string;
  permissions: PermissionLeaf[];
}

interface CategoryNode {
  category: string;
  businesses: BusinessNode[];
}

export interface TheTreeRef {
  refresh: (filters?: FilterState) => void;
}

interface Props {
  initialRoleId?: number | null;
  allPermissions: ListAllPermissionRes;
  formRef: React.RefObject<TheFormRef | null>;
}

const TheTree = memo(
  forwardRef<TheTreeRef, Props>(({ initialRoleId, allPermissions, formRef }, ref) => {
    const t = useTranslation();
    const [roleId, setRoleId] = useState<number | null | undefined>(initialRoleId ?? null);
    const refreshKeyRef = useRef(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rolePermissions, setRolePermissions] = useState<NonNullable<ListAllRolePermissionRes>>(
      [],
    );

    useImperativeHandle(ref, () => ({
      refresh: (filters?) => {
        if (filters && 'roleId' in filters) {
          setRoleId(filters.roleId ?? null);
        }
        refreshKeyRef.current += 1;
        setRefreshKey(refreshKeyRef.current);
      },
    }));

    // 当 roleId / refreshKey 变化时拉取数据
    useEffect(() => {
      if (!roleId) {
        setRolePermissions([]);
        return;
      }
      let cancelled = false;
      setLoading(true);
      setError(null);
      RolePermissionAPI.listAllFn({ data: { roleId } })
        .then((res) => {
          if (!cancelled) {
            setRolePermissions(res.data.data || []);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [roleId, refreshKey]);

    // 构建权限 Map
    const permissionMap = useMemo(() => {
      const map = new Map<number, NonNullable<ListAllPermissionRes>[0]>();
      for (const p of allPermissions ?? []) {
        if (p?.id != null) map.set(p.id, p);
      }
      return map;
    }, [allPermissions]);

    // 构建树形结构：category → business → permission
    const tree = useMemo<CategoryNode[]>(() => {
      const categoryMap = new Map<string, Map<string, PermissionLeaf[]>>();

      for (const rp of rolePermissions) {
        const perm = permissionMap.get(rp.permissionId);
        if (!perm) continue;

        const category = perm.category!;
        const business = perm.business!;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, new Map());
        }
        const bizMap = categoryMap.get(category)!;
        if (!bizMap.has(business)) {
          bizMap.set(business, []);
        }
        bizMap.get(business)!.push({
          id: perm.id,
          code: perm.code,
          name: perm.name!,
          category,
          business: perm.business,
          resource: perm.resource,
          rolePermissionId: rp.id,
        });
      }

      const result: CategoryNode[] = [];
      for (const [category, bizMap] of categoryMap.entries()) {
        const businesses: BusinessNode[] = [];
        for (const [business, perms] of bizMap.entries()) {
          businesses.push({ business, permissions: perms });
        }
        result.push({ category, businesses });
      }
      return result;
    }, [rolePermissions, permissionMap]);

    if (!roleId) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('system.rolePermission.tree.selectRole')}
          </Typography>
        </Box>
      );
    }

    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2">{t('common.loading')}</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      );
    }

    if (tree.length === 0) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('rolePermission.noPermissions')}
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <SimpleTreeView
          defaultExpandedItems={tree.map((c) => `cat-${c.category}`)}
          sx={{ flexGrow: 1, overflowY: 'auto' }}
        >
          {tree.map((catNode) => (
            <TreeItem
              key={catNode.category}
              itemId={`cat-${catNode.category}`}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                  <FolderIcon fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight={600}>
                    {catNode.category}
                  </Typography>
                  <Chip
                    label={
                      rolePermissions.filter((rp) => {
                        const p = permissionMap.get(rp.permissionId);
                        return p?.category === catNode.category;
                      }).length
                    }
                    size="small"
                    color={CATEGORY_COLOR[catNode.category] ?? 'default'}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                </Box>
              }
            >
              {catNode.businesses.map((bizNode) => (
                <TreeItem
                  key={`${catNode.category}-${bizNode.business}`}
                  itemId={`biz-${catNode.category}-${bizNode.business}`}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                      <LabelIcon fontSize="small" color="disabled" />
                      <Typography variant="body2">{bizNode.business}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({bizNode.permissions.length})
                      </Typography>
                    </Box>
                  }
                >
                  {bizNode.permissions.map((perm) => (
                    <TreeItem
                      key={perm.id}
                      itemId={`perm-${perm.id}`}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                          <KeyIcon fontSize="small" sx={{ color: 'text.disabled', fontSize: 14 }} />
                          <Typography variant="body2">{perm.name}</Typography>
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {perm.code}
                          </Typography>
                          <Box sx={{ ml: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <RolePermissionActionButtons
                              row={
                                {
                                  id: perm.rolePermissionId,
                                  roleId: roleId!,
                                  permissionId: perm.id,
                                } as never
                              }
                              formRef={formRef}
                              onDeleteSuccess={() =>
                                ref && 'current' in ref && ref.current?.refresh()
                              }
                            />
                          </Box>
                        </Box>
                      }
                    />
                  ))}
                </TreeItem>
              ))}
            </TreeItem>
          ))}
        </SimpleTreeView>
      </Box>
    );
  }),
);

TheTree.displayName = 'TheTree';

export default TheTree;
