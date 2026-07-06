import { type AlertColor } from '@mui/material';
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
export declare const SnackbarItem: ({
  id,
  message,
  type,
  duration,
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
