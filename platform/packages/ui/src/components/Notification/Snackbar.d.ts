import { type AlertColor } from '@mui/material';
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
export declare const SnackbarItem: ({
  id,
  message,
  type,
  duration,
  detail,
  action,
  secondaryAction,
  onClose,
}: SnackbarItemProps) => import('react/jsx-runtime').JSX.Element;
export interface SnackbarStackProps {
  items: SnackbarOptions[];
  onRemove: (id: string) => void;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}
export declare const SnackbarStack: ({
  items,
  onRemove,
  position,
}: SnackbarStackProps) => import('react/jsx-runtime').JSX.Element;
