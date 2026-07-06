import React, { createContext, useContext, useEffect } from 'react';

export interface LayoutConfig {
  hideSidebar?: boolean;
  hideTopbar?: boolean;
}

export interface LayoutConfigContextType {
  config: LayoutConfig;
  setConfig: React.Dispatch<React.SetStateAction<LayoutConfig>>;
}

const GLOBAL_LAYOUT_CONFIG_CONTEXT_KEY = Symbol.for('__HODOR_GLOBAL_LAYOUT_CONFIG_CONTEXT__');

type GlobalWindow = typeof window & {
  [GLOBAL_LAYOUT_CONFIG_CONTEXT_KEY]?: React.Context<LayoutConfigContextType | undefined>;
};

export const LayoutConfigContext = (
  typeof window !== 'undefined'
    ? (window as unknown as GlobalWindow)[GLOBAL_LAYOUT_CONFIG_CONTEXT_KEY] ||
      ((window as unknown as GlobalWindow)[GLOBAL_LAYOUT_CONFIG_CONTEXT_KEY] = createContext<
        LayoutConfigContextType | undefined
      >(undefined))
    : createContext<LayoutConfigContextType | undefined>(undefined)
) as React.Context<LayoutConfigContextType | undefined>;

export const useLayoutConfig = (pageConfig?: LayoutConfig) => {
  const context = useContext(LayoutConfigContext);
  if (!context) {
    throw new Error('useLayoutConfig must be used within a LayoutConfigProvider');
  }
  const { config, setConfig } = context;

  useEffect(() => {
    if (pageConfig) {
      setConfig(pageConfig);
      return () => {
        setConfig({});
      };
    }
  }, [pageConfig, setConfig]);

  return { config, setConfig };
};
