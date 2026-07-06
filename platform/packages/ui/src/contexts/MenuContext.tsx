import React, { createContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import type { SystemMenuTree } from '@/layout/components/type';
import { treeFn } from '@/api/infra/system/menu';
import { useTranslation } from '@/hooks/useTranslation';
import { showSnackbar } from '@/components/Notification';
interface MenuNode extends Omit<SystemMenuTree, 'children'> {
  children?: MenuNode[];
}

export type { MenuNode };

interface MenuContextType {
  navItems: MenuNode[];
  setNavItems: (items: MenuNode[]) => void;
  loading: boolean;
  loadMenus: () => Promise<MenuNode[]>;
}

const GLOBAL_MENU_CONTEXT_KEY = Symbol.for('__HODOR_GLOBAL_MENU_CONTEXT__');

type GlobalWindow = typeof window & {
  [GLOBAL_MENU_CONTEXT_KEY]?: React.Context<MenuContextType | undefined>;
};

const MenuContext = (
  typeof window !== 'undefined'
    ? (window as unknown as GlobalWindow)[GLOBAL_MENU_CONTEXT_KEY] ||
      ((window as unknown as GlobalWindow)[GLOBAL_MENU_CONTEXT_KEY] = createContext<MenuContextType | undefined>(
        undefined,
      ))
    : createContext<MenuContextType | undefined>(undefined)
) as React.Context<MenuContextType | undefined>;

// 递归过滤符合当前应用 Scope 的菜单
const filterMenuByScope = (nodes: MenuNode[], scope: string): MenuNode[] => {
  return nodes.reduce<MenuNode[]>((acc, node) => {
    let filteredChildren: MenuNode[] | undefined;
    if (node.children && node.children.length > 0) {
      filteredChildren = filterMenuByScope(node.children, scope);
    }

    const hasValidChild = filteredChildren && filteredChildren.length > 0;

    let isValidNode = false;
    if (node.path === '/home' || node.path === '/me' || !node.path) {
      if (node.path === '/home' || node.path === '/me') {
        isValidNode = true;
      }
    } else if (scope === 'admin') {
      isValidNode = true;
    } else if (scope === 'enterprise' && node.path.startsWith('/biz/')) {
      isValidNode = true;
    } else if (scope === 'personal' && node.path.startsWith('/personal/')) {
      isValidNode = true;
    }

    if (isValidNode || hasValidChild) {
      acc.push({
        ...node,
        children: filteredChildren,
      });
    }
    return acc;
  }, []);
};

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [navItems, setNavItems] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslation();

  // 规范化后端返回的数据，确保 children 为 MenuNode[]
  const normalizeMenus = useCallback((items: unknown): MenuNode[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const raw = item as Record<string, unknown>;
      const childrenRaw = Array.isArray(raw.children) ? raw.children : [];
      const children = normalizeMenus(childrenRaw);
      const { children: _children, ...rest } = raw;
      void _children;
      return { ...(rest as unknown as Omit<SystemMenuTree, 'children'>), children };
    });
  }, []);

  // 异步加载菜单数据
  const loadMenuData = useCallback(async (): Promise<MenuNode[]> => {
    setLoading(true);
    try {
      const resData = await treeFn({ data: {} });
      const normalizedMenus = normalizeMenus(resData.data.data);
      const scope = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_APP_SCOPE || 'admin';
      const filteredMenus = filterMenuByScope(normalizedMenus, scope);
      if (!filteredMenus?.length) {
        // 给到提示：菜单为空，请联系管理员添加菜单
        showSnackbar({
          message: t('sidebar.menu.emptyPrompt'),
          type: 'warning',
        });
        return [];
      }
      setNavItems(filteredMenus);
      return filteredMenus;
    } catch (error) {
      console.error('Failed to load menus', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [normalizeMenus, t]);

  // 初始化时加载菜单
  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  return (
    <MenuContext.Provider value={{ navItems, setNavItems, loading, loadMenus: loadMenuData }}>
      {children}
    </MenuContext.Provider>
  );
};

export { MenuContext };
