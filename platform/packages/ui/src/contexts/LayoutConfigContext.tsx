import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LayoutConfig {
  hideSidebar?: boolean;
  hideTopbar?: boolean;
}

interface LayoutConfigContextType {
  config: LayoutConfig;
  setConfig: React.Dispatch<React.SetStateAction<LayoutConfig>>;
}

const GLOBAL_LAYOUT_CONFIG_CONTEXT_KEY = Symbol.for('__HODOR_GLOBAL_LAYOUT_CONFIG_CONTEXT__');
const LayoutConfigContext = (
  typeof window !== 'undefined'
    ? (window as any)[GLOBAL_LAYOUT_CONFIG_CONTEXT_KEY] ||
      ((window as any)[GLOBAL_LAYOUT_CONFIG_CONTEXT_KEY] = createContext<
        LayoutConfigContextType | undefined
      >(undefined))
    : createContext<LayoutConfigContextType | undefined>(undefined)
) as React.Context<LayoutConfigContextType | undefined>;

export const LayoutConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<LayoutConfig>({});
  return (
    <LayoutConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </LayoutConfigContext.Provider>
  );
};

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
