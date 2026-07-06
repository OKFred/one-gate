import React from 'react';
export interface LayoutConfig {
  hideSidebar?: boolean;
  hideTopbar?: boolean;
}
export declare const LayoutConfigProvider: React.FC<{
  children: React.ReactNode;
}>;
export declare const useLayoutConfig: (pageConfig?: LayoutConfig) => {
  config: LayoutConfig;
  setConfig: React.Dispatch<React.SetStateAction<LayoutConfig>>;
};
