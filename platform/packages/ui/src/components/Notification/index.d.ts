import { type NotificationOptions } from './NotificationDialog';
import { type ConfirmationOptions } from './ConfirmationDialog';
import { type SnackbarOptions } from './Snackbar';
export type { ConfirmationOptions, NotificationOptions, SnackbarOptions };
export type { SnackbarAction } from './Snackbar';
export interface SnackbarHandle {
  id: string;
  update: (options: Partial<Omit<SnackbarOptions, 'id'>>) => void;
  close: () => void;
}
export declare const showConfirm: (options: ConfirmationOptions) => Promise<boolean>;
export declare const showGlobalNotification: (options: NotificationOptions) => void;
export declare const showSnackbar: (options: SnackbarOptions) => SnackbarHandle;
