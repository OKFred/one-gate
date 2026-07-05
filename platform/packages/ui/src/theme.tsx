import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { getThemeMode } from '@/hooks/useThemeMode';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useState<'light' | 'dark'>(getThemeMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    // 监听主题变化
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme === 'dark' || theme === 'light') {
        setMode(theme);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
};
