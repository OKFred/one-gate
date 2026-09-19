import { createRoot, type Root } from 'react-dom/client';
import { ConfirmationDialog, type ConfirmationOptions } from './ConfirmationDialog';
import { NotificationDialog, type NotificationOptions } from './NotificationDialog';
import { SnackbarStack, type SnackbarOptions } from './Snackbar';

// 导出类型
export type { ConfirmationOptions, NotificationOptions, SnackbarOptions };
export type { SnackbarAction } from './Snackbar';

export interface SnackbarHandle {
  id: string;
  update: (options: Partial<Omit<SnackbarOptions, 'id'>>) => void;
  close: () => void;
}

/** 显示现代确认对话框，并以 Promise 返回用户选择。 */
export const showConfirm = (options: ConfirmationOptions): Promise<boolean> =>
  new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    let settled = false;

    const finish = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      resolve(confirmed);
    };

    const cleanup = () => {
      setTimeout(() => {
        root.unmount();
        if (document.body.contains(container)) document.body.removeChild(container);
      }, 0);
    };

    root.render(<ConfirmationDialog {...options} onResult={finish} onExited={cleanup} />);
  });

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

// Snackbar 堆叠管理
let snackbarRoot: Root | null = null;
let activeSnackbars: SnackbarOptions[] = [];

const removeSnackbar = (id: string) => {
  const removed = activeSnackbars.find((item) => item.id === id);
  if (!removed) return;
  activeSnackbars = activeSnackbars.filter((item) => item.id !== id);
  removed.onDismiss?.();
  renderSnackbars();
};

const renderSnackbars = () => {
  if (!snackbarRoot) {
    const container = document.createElement('div');
    container.id = 'global-snackbar-container';
    document.body.appendChild(container);
    snackbarRoot = createRoot(container);
  }

  const root = snackbarRoot;

  // 默认使用第一个项的位置作为容器位置 (假设全局一致)
  const position = activeSnackbars[0]?.position;

  root.render(
    <SnackbarStack items={activeSnackbars} onRemove={removeSnackbar} position={position} />,
  );
};

export const showSnackbar = (options: SnackbarOptions): SnackbarHandle => {
  const id = options.id ?? crypto.randomUUID();
  removeSnackbar(id);
  activeSnackbars = [...activeSnackbars, { ...options, id }];
  renderSnackbars();
  return {
    id,
    update: (changes) => {
      if (!activeSnackbars.some((item) => item.id === id)) return;
      activeSnackbars = activeSnackbars.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      );
      renderSnackbars();
    },
    close: () => removeSnackbar(id),
  };
};
