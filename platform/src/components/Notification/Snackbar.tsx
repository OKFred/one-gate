import { useState, useEffect } from 'react';
import { Alert, Stack, Collapse, type AlertColor } from '@mui/material';
import { ThemeProvider, createTheme, type SxProps, type Theme } from '@mui/material/styles';

const theme = createTheme();

export interface SnackbarOptions {
  id?: string;
  message: string;
  type?: AlertColor;
  duration?: number;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

export interface SnackbarItemProps extends SnackbarOptions {
  id: string;
  onClose: (id: string) => void;
}

export const SnackbarItem = ({
  id,
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: SnackbarItemProps) => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Collapse in={open} onExited={() => onClose(id)}>
      <Alert
        onClose={handleClose}
        severity={type}
        variant="filled"
        sx={{
          width: '100%',
          minWidth: '300px',
          boxShadow: (theme) => theme.shadows[3],
        }}
      >
        {message}
      </Alert>
    </Collapse>
  );
};

export interface SnackbarStackProps {
  items: SnackbarOptions[];
  onRemove: (id: string) => void;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

export const SnackbarStack = ({
  items,
  onRemove,
  position = { vertical: 'top', horizontal: 'center' },
}: SnackbarStackProps) => {
  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    top: 0,
  };

  // 根据 position 调整样式 (简化版，仅支持 top-center 为主)
  if (position?.vertical === 'bottom') {
    containerStyles.top = 'auto';
    containerStyles.bottom = 0;
    containerStyles.flexDirection = 'column-reverse';
  }
  if (position?.horizontal === 'left') {
    containerStyles.left = 0;
    containerStyles.transform = 'none';
  } else if (position?.horizontal === 'right') {
    containerStyles.left = 'auto';
    containerStyles.right = 0;
    containerStyles.transform = 'none';
  }

  return (
    <ThemeProvider theme={theme}>
      <Stack sx={containerStyles as SxProps<Theme>}>
        {items.map((item) => (
          <div key={item.id || Math.random().toString()} style={{ pointerEvents: 'auto' }}>
            <SnackbarItem {...item} id={item.id || ''} onClose={onRemove} />
          </div>
        ))}
      </Stack>
    </ThemeProvider>
  );
};
