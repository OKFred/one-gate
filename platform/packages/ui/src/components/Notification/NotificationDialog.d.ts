export interface NotificationOptions {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  callback?: (action: 'confirm' | 'cancel' | 'close') => void;
  beforeClose?: (
    action: 'confirm' | 'cancel' | 'close',
    instance: {
      close: () => void;
    },
    done: () => void,
  ) => void;
  showClose?: boolean;
}
export interface NotificationDialogProps extends NotificationOptions {
  onExited: () => void;
}
export declare const NotificationDialog: ({
  message,
  type,
  title,
  callback,
  beforeClose,
  showClose,
  onExited,
}: NotificationDialogProps) => import('react/jsx-runtime').JSX.Element;
