import type { components } from '@/types/openapi';
export type LoginResponse = components['schemas']['admin.system.auth.login.res']['data'];
export type UserInfo = LoginResponse['userObj'];
export declare const authUtils: {
  isAuthenticated(): boolean;
  setUserInfo(userInfo: UserInfo): void;
  getUserInfo(): UserInfo | null;
  removeUserInfo(): void;
  logout(): void;
  getAuthHeader():
    | {
        Authorization: string;
      }
    | Record<string, never>;
};
