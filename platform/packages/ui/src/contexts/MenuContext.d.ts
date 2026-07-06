import React, { type ReactNode } from 'react';
import type { SystemMenuTree } from '@/layout/components/type';
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
declare const MenuContext: React.Context<MenuContextType | undefined>;
export declare const MenuProvider: React.FC<{
  children: ReactNode;
}>;
export { MenuContext };
