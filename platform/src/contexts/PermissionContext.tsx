import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { getButtonPermissionFn } from '@/api/system/auth';
import type { GetButtonPermissionsRes } from '@/api/system/type';

type PermissionItem = GetButtonPermissionsRes['permissions'][0];
interface PermissionContextType {
  /** 权限列表 */
  permissions: PermissionItem[];
  /** 权限 code 集合，用于快速查找 */
  permissionCodes: Set<string>;
  /** 加载状态 */
  loading: boolean;
  /** 检查是否有多个权限中的任意一个 */
  hasAnyPermission: (codes: string[]) => boolean;
  /** 检查是否同时拥有多个权限 */
  hasAllPermissions: (codes: string[]) => boolean;
  /** 刷新权限 */
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 将权限列表转换为 Set，方便快速查找
  const permissionCodes = useMemo(() => {
    return new Set(permissions.filter((p) => p.isEnabled).map((p) => p.code));
  }, [permissions]);

  // 加载权限数据
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const resData = await getButtonPermissionFn({ data: {} });
      setPermissions(resData.data.data.permissions);
    } catch (error) {
      console.error('Failed to load permissions', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // 检查是否有多个权限中的任意一个
  const hasAnyPermission = useCallback(
    (codes: string[]): boolean => {
      return codes.some((code) => permissionCodes.has(code));
    },
    [permissionCodes],
  );

  // 检查是否同时拥有多个权限
  const hasAllPermissions = useCallback(
    (codes: string[]): boolean => {
      return codes.every((code) => permissionCodes.has(code));
    },
    [permissionCodes],
  );

  const value = useMemo(
    () => ({
      permissions,
      permissionCodes,
      loading,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions: loadPermissions,
    }),
    [permissions, permissionCodes, loading, hasAnyPermission, hasAllPermissions, loadPermissions],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export { PermissionContext };
