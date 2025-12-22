import { createRoot } from 'react-dom/client';
import { NotificationDialog, type NotificationOptions } from './NotificationDialog';

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
