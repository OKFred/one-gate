import type { AlertColor } from '@mui/material';

// 全局通知函数（用于非 React 组件中，如 axios 拦截器）
let globalNotificationFunction: ((message: string, severity?: AlertColor) => void) | null = null;

export const setGlobalNotification = (fn: (message: string, severity?: AlertColor) => void) => {
  globalNotificationFunction = fn;
};

export const showGlobalNotification = (message: string, severity: AlertColor = 'info') => {
  if (globalNotificationFunction) {
    globalNotificationFunction(message, severity);
  } else {
    console.warn('Global notification not initialized');
    console.error(message);
  }
};
