import React, { createContext, useState, type ReactNode } from 'react';
import type { SystemMenuTree } from '@/layout/components/type';
interface MenuNode extends Omit<SystemMenuTree, 'children'> {
  children?: MenuNode[];
}

interface MenuContextType {
  navItems: MenuNode[];
  setNavItems: (items: MenuNode[]) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [navItems, setNavItems] = useState<MenuNode[]>([]);

  return <MenuContext.Provider value={{ navItems, setNavItems }}>{children}</MenuContext.Provider>;
};

export { MenuContext };
