import { createRoot } from 'react-dom/client';
import { NotificationDialog, type NotificationOptions } from './NotificationDialog';
import { SnackbarNotification, type SnackbarOptions } from './Snackbar';

// 导出类型
export type { NotificationOptions, SnackbarOptions };

export const showGlobalNotification = (options: NotificationOptions) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    setTimeout(() => {
      root.unmount();
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }, 0);
  };

  root.render(<NotificationDialog {...options} onExited={cleanup} />);
};

export const showSnackbar = (options: SnackbarOptions) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    setTimeout(() => {
      root.unmount();
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }, 0);
  };

  root.render(<SnackbarNotification {...options} onExited={cleanup} />);
};
