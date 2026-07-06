/**
 * 获取当前主题模式（纯函数，无副作用）
 * 优先级：localStorage 手动设置 > 系统偏好 > 默认 light
 */
export declare function getThemeMode(): 'light' | 'dark';
/**
 * Hook：获取当前主题模式的初始值
 * 返回 [isDark, mode]
 */
export declare function useThemeMode(): {
  mode: 'light' | 'dark';
  isDark: boolean;
};
