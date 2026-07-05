import { loginPath } from '@/routes';
import { useMenu } from './useMenu';
import type { MenuNode } from '@/contexts/MenuContext';

// 递归查找第一个有效的路径
export const findFirstValidPath = (items: MenuNode[], fallback: string = loginPath): string => {
  const findPath = (list: MenuNode[]): string | null => {
    for (const item of list) {
      if (item.path) return item.path;
      if (item.children && item.children.length > 0) {
        const childPath = findPath(item.children);
        if (childPath) return childPath;
      }
    }
    return null;
  };

  return findPath(items) || fallback;
};

export const useFirstValidPath = (fallback: string = loginPath): string => {
  const { navItems } = useMenu();
  return findFirstValidPath(navItems, fallback);
};
