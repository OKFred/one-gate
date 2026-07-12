import {
  useEffect,
  useState,
  useMemo,
  memo,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Box,
  CircularProgress,
  Typography,
  Checkbox,
  Chip,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderIcon from '@mui/icons-material/Folder';
import * as RolePermissionAPI from '@/api/admin/system/role_permission';
import * as PermissionAPI from '@/api/admin/system/permission';
import type { ListAllPermissionRes, GetPermissionsByRoleRes } from '@/api/admin/system/type';

type PermissionItem = NonNullable<ListAllPermissionRes>[0];

// 树节点
interface TreeNode {
  /** 节点 key，即 business 值 */
  key: string;
  /** 该节点直属的权限 */
  permissions: PermissionItem[];
  /** 子节点 */
  children: TreeNode[];
}

export interface TheTreeRef {
  getChanges: () => { added: number[]; removed: number[] };
  hasChanges: () => boolean;
  reload: () => void;
}

interface Props {
  roleId: number | null;
  onChange?: (hasChanges: boolean) => void;
}

/**
 * 根据 business 字段的 "." 分隔构建层级树
 * 例如: enterprise → enterprise.attendance 构成父子关系
 */
function buildTree(permissions: PermissionItem[]): TreeNode[] {
  // 1. 按 business 分组
  const bizMap = new Map<string, PermissionItem[]>();
  for (const p of permissions) {
    const biz = p.business || 'other';
    if (!bizMap.has(biz)) bizMap.set(biz, []);
    bizMap.get(biz)!.push(p);
  }

  // 2. 收集所有 business key 并排序
  const allKeys = Array.from(bizMap.keys()).sort();

  // 3. 构建层级关系
  const rootNodes: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  for (const key of allKeys) {
    const node: TreeNode = {
      key,
      permissions: bizMap.get(key) || [],
      children: [],
    };
    nodeMap.set(key, node);

    // 查找父节点：逐级向上查找（例如 enterprise.attendance → enterprise）
    let parentFound = false;
    const dotIndex = key.lastIndexOf('.');
    if (dotIndex > 0) {
      const parentKey = key.substring(0, dotIndex);
      const parentNode = nodeMap.get(parentKey);
      if (parentNode) {
        parentNode.children.push(node);
        parentFound = true;
      }
    }

    if (!parentFound) {
      rootNodes.push(node);
    }
  }

  return rootNodes;
}

/** 递归获取节点及其所有后代的权限 ID */
function getAllPermissionIds(node: TreeNode): number[] {
  const ids = node.permissions.map((p) => p.id);
  for (const child of node.children) {
    ids.push(...getAllPermissionIds(child));
  }
  return ids;
}

const TheTree = memo(
  forwardRef<TheTreeRef, Props>(({ roleId, onChange }, ref) => {
    const t = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
    const [initialCheckedIds, setInitialCheckedIds] = useState<Set<number>>(new Set());
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const loadData = useCallback(async () => {
      if (!roleId) {
        setAllPermissions([]);
        setInitialCheckedIds(new Set());
        setCheckedIds(new Set());
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [permRes, rolePermRes] = await Promise.all([
          PermissionAPI.listAllFn({ data: {} }),
          RolePermissionAPI.getPermissionsByRoleFn({ data: { roleId } }),
        ]);

        const permissions = (permRes.data.data || []) as PermissionItem[];
        const rolePerms = (rolePermRes.data.data || []) as GetPermissionsByRoleRes;
        const assignedIds = new Set(rolePerms.map((p) => p.id));

        setAllPermissions(permissions);
        setInitialCheckedIds(assignedIds);
        setCheckedIds(new Set(assignedIds));

        // 默认展开有已分配权限的分组
        const expanded = new Set<string>();
        permissions.forEach((p) => {
          if (assignedIds.has(p.id) && p.business) {
            // 展开自身和所有父级
            const parts = p.business.split('.');
            let path = '';
            for (const part of parts) {
              path = path ? `${path}.${part}` : part;
              expanded.add(path);
            }
          }
        });
        setExpandedNodes(expanded);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }, [roleId]);

    useEffect(() => {
      loadData();
    }, [loadData]);

    const hasChanges = useCallback(() => {
      if (checkedIds.size !== initialCheckedIds.size) return true;
      for (const id of checkedIds) {
        if (!initialCheckedIds.has(id)) return true;
      }
      return false;
    }, [checkedIds, initialCheckedIds]);

    // 通知外部变更
    useEffect(() => {
      onChange?.(hasChanges());
    }, [hasChanges, onChange]);

    useImperativeHandle(
      ref,
      () => ({
        getChanges: () => {
          const added = Array.from(checkedIds).filter((id) => !initialCheckedIds.has(id));
          const removed = Array.from(initialCheckedIds).filter((id) => !checkedIds.has(id));
          return { added, removed };
        },
        hasChanges,
        reload: loadData,
      }),
      [checkedIds, initialCheckedIds, hasChanges, loadData],
    );

    // 构建树
    const tree = useMemo(() => buildTree(allPermissions), [allPermissions]);

    // 切换单个权限
    const togglePermission = useCallback((permId: number) => {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (next.has(permId)) next.delete(permId);
        else next.add(permId);
        return next;
      });
    }, []);

    // 切换整个节点（包含子节点）
    const toggleNode = useCallback(
      (node: TreeNode) => {
        const allIds = getAllPermissionIds(node);
        const allChecked = allIds.every((id) => checkedIds.has(id));
        setCheckedIds((prev) => {
          const next = new Set(prev);
          if (allChecked) {
            allIds.forEach((id) => next.delete(id));
          } else {
            allIds.forEach((id) => next.add(id));
          }
          return next;
        });
      },
      [checkedIds],
    );

    // 切换展开/折叠
    const toggleExpand = useCallback((key: string) => {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }, []);

    const expandAll = useCallback(() => {
      const all = new Set<string>();
      const collect = (nodes: TreeNode[]) => {
        for (const n of nodes) {
          all.add(n.key);
          collect(n.children);
        }
      };
      collect(tree);
      setExpandedNodes(all);
    }, [tree]);

    const collapseAll = useCallback(() => {
      setExpandedNodes(new Set());
    }, []);

    // 渲染单个树节点
    const renderNode = (node: TreeNode, depth: number) => {
      const isExpanded = expandedNodes.has(node.key);
      const hasChildren = node.children.length > 0 || node.permissions.length > 0;
      const allIds = getAllPermissionIds(node);
      const checkedCount = allIds.filter((id) => checkedIds.has(id)).length;
      const allChecked = allIds.length > 0 && checkedCount === allIds.length;
      const someChecked = checkedCount > 0 && !allChecked;

      return (
        <Box key={node.key}>
          {/* 节点行 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              pl: depth * 3 + 1,
              pr: 1,
              py: 0.5,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              borderBottom: 1,
              borderColor: 'divider',
            }}
            onClick={() => toggleExpand(node.key)}
          >
            {hasChildren ? (
              <IconButton size="small" sx={{ mr: 0.5, p: 0.25 }}>
                {isExpanded ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 28 }} />
            )}
            <Checkbox
              size="small"
              checked={allChecked}
              indeterminate={someChecked}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleNode(node)}
              sx={{ p: 0.5 }}
            />
            {isExpanded ? (
              <FolderOpenIcon fontSize="small" color="primary" sx={{ mx: 0.5 }} />
            ) : (
              <FolderIcon fontSize="small" color="action" sx={{ mx: 0.5 }} />
            )}
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
              {t('businessType.' + node.key)}
            </Typography>
            <Chip
              label={`${checkedCount}/${allIds.length}`}
              size="small"
              color={allChecked ? 'success' : someChecked ? 'warning' : 'default'}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>

          {/* 展开内容 */}
          <Collapse in={isExpanded}>
            {/* 本级权限 */}
            {node.permissions.length > 0 && (
              <Box sx={{ pl: depth * 3 + 5, pr: 2, py: 0.5 }}>
                {node.permissions.map((perm) => {
                  const isChecked = checkedIds.has(perm.id);
                  const isNew = isChecked && !initialCheckedIds.has(perm.id);
                  const isRemoved = !isChecked && initialCheckedIds.has(perm.id);

                  return (
                    <Box
                      key={perm.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 0.25,
                        px: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                        cursor: 'pointer',
                        ...(isNew && {
                          bgcolor: 'success.main',
                          color: 'success.contrastText',
                          '&:hover': { bgcolor: 'success.dark' },
                        }),
                        ...(isRemoved && {
                          bgcolor: 'error.main',
                          color: 'error.contrastText',
                          '&:hover': { bgcolor: 'error.dark' },
                        }),
                      }}
                      onClick={() => togglePermission(perm.id)}
                    >
                      <Checkbox
                        size="small"
                        checked={isChecked}
                        onChange={() => togglePermission(perm.id)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          p: 0.5,
                          ...(isNew && {
                            color: 'success.contrastText',
                            '&.Mui-checked': { color: 'success.contrastText' },
                          }),
                          ...(isRemoved && { color: 'error.contrastText' }),
                        }}
                      />
                      <Typography variant="body2" sx={{ mr: 1 }}>
                        {perm.name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.7 }}>
                        {perm.code}
                      </Typography>
                      {isNew && (
                        <Chip
                          label="+"
                          size="small"
                          sx={{
                            ml: 'auto',
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: 'transparent',
                            color: 'inherit',
                            border: '1px solid currentColor',
                          }}
                        />
                      )}
                      {isRemoved && (
                        <Chip
                          label="-"
                          size="small"
                          sx={{
                            ml: 'auto',
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: 'transparent',
                            color: 'inherit',
                            border: '1px solid currentColor',
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* 子节点递归 */}
            {node.children.map((child) => renderNode(child, depth + 1))}
          </Collapse>
        </Box>
      );
    };

    if (!roleId) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {t('system.rolePermission.tree.selectRole')}
          </Typography>
        </Box>
      );
    }

    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">{t('common.loading')}</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      );
    }

    const totalChecked = checkedIds.size;
    const totalPermissions = allPermissions.length;

    return (
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* 统计栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {`${totalChecked} / ${totalPermissions}`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={t('common.expandAll')}
              size="small"
              variant="outlined"
              onClick={expandAll}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={t('common.collapseAll')}
              size="small"
              variant="outlined"
              onClick={collapseAll}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </Box>

        {/* 树 */}
        {tree.map((node) => renderNode(node, 0))}
      </Box>
    );
  }),
);

TheTree.displayName = 'TheTree';

export default TheTree;
