import React, { useState } from 'react';
import { LayoutConfigContext, type LayoutConfig } from './LayoutConfigContextCore';

export const LayoutConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<LayoutConfig>({});
  return (
    <LayoutConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </LayoutConfigContext.Provider>
  );
};
