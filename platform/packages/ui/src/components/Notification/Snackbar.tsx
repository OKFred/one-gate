import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Stack,
  Collapse,
  Button,
  IconButton,
  Typography,
  type AlertColor,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { ThemeProvider, createTheme, type SxProps, type Theme } from '@mui/material/styles';
import { useTranslation } from '@/hooks/useTranslation';

const theme = createTheme();

export interface SnackbarAction {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

export interface SnackbarOptions {
  id?: string;
  message: string;
  type?: AlertColor;
  duration?: number;
  detail?: string;
  action?: SnackbarAction;
  secondaryAction?: SnackbarAction;
  onDismiss?: () => void;
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
  detail,
  action,
  secondaryAction,
  onClose,
}: SnackbarItemProps) => {
  const [open, setOpen] = useState(true);
  const [executing, setExecuting] = useState(false);
  const actionInFlight = useRef(false);
  const mounted = useRef(true);
  const t = useTranslation();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = async (next: SnackbarAction) => {
    if (actionInFlight.current || next.disabled || next.loading) return;
    actionInFlight.current = true;
    setExecuting(true);
    try {
      await next.onClick();
    } catch {
      // The action owner or HTTP layer presents its failure.
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setExecuting(false);
    }
  };

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
        action={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {[action, secondaryAction].map(
              (item, index) =>
                item && (
                  <Button
                    key={index}
                    color="inherit"
                    size="small"
                    disabled={executing || item.disabled || item.loading}
                    aria-busy={item.loading || undefined}
                    onClick={() => void execute(item)}
                  >
                    {item.label}
                  </Button>
                ),
            )}
            <IconButton
              color="inherit"
              size="small"
              aria-label={t('common.close')}
              onClick={handleClose}
            >
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        }
        severity={type}
        variant="filled"
        sx={{
          width: '100%',
          minWidth: 'min(300px, calc(100vw - 32px))',
          maxWidth: 'min(680px, calc(100vw - 32px))',
          flexWrap: 'wrap',
          boxShadow: (theme) => theme.shadows[3],
        }}
      >
        {message}
        {detail && (
          <Typography component="div" variant="body2">
            {detail}
          </Typography>
        )}
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
