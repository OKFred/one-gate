import React, { createContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import type { SystemMenuTree } from '@/layout/components/type';
import { treeFn } from '@/api/system/menu';
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

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [navItems, setNavItems] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);

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
      setNavItems(normalizedMenus);
      return normalizedMenus;
    } catch (error) {
      console.error('Failed to load menus', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [normalizeMenus]);

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
