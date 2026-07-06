import React from 'react';
interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}
declare const Sidebar: React.FC<SidebarProps>;
export default Sidebar;
