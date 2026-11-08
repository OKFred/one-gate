import { useMemo, useState, type ReactNode } from 'react';
import { Button, CssBaseline, ThemeProvider, createTheme } from '@mui/material';

export default function PreviewTheme({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Button
        data-testid="preview-theme-toggle"
        onClick={() => setMode((value) => (value === 'light' ? 'dark' : 'light'))}
      >
        切换预览主题
      </Button>
      {children}
    </ThemeProvider>
  );
}
