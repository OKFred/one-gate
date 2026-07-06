import { type UserInfo } from '@/utils/auth';
interface UseUserInfoReturn {
  /** 用户信息对象 */
  userInfo: UserInfo | null;
  /** 获取用户显示名称 */
  getDisplayName: (fallback?: string) => string;
  /** 获取用户头像字符（用户名首字母） */
  getAvatar: () => string;
}
/**
 * 自定义 Hook：获取当前登录用户信息及相关辅助函数
 */
export declare const useUserInfo: () => UseUserInfoReturn;
export {};
