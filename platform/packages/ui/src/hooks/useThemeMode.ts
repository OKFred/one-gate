import { useState } from 'react';

/**
 * 获取当前主题模式（纯函数，无副作用）
 * 优先级：localStorage 手动设置 > 系统偏好 > 默认 light
 */
export function getThemeMode(): 'light' | 'dark' {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') return 'dark';
  if (saved === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Hook：获取当前主题模式的初始值
 * 返回 [isDark, mode]
 */
export function useThemeMode() {
  const [mode] = useState(getThemeMode);
  return { mode, isDark: mode === 'dark' };
}
