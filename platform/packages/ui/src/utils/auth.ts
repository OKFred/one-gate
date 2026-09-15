// 认证相关的工具函数
import type { components } from '@/types/openapi';

const USER_KEY = 'userInfo';
const SESSION_KEY = 'hodor:auth-session';
const RUNTIME_KEY = Symbol.for('hodor:auth-runtime');
export const AUTH_CHANGED_EVENT = 'hodor:auth-changed';
export const TOTP_GATE_REQUIRED_EVENT = 'hodor:totp-gate-required';
export type LoginResponse = components['schemas']['admin.system.auth.login.res']['data'];
export type UserInfo = LoginResponse['userObj'];

export interface AuthSessionSnapshot {
  readonly token: string | null;
  readonly revision: number;
}

interface AuthRuntime {
  snapshot: AuthSessionSnapshot;
  marker: string | null;
  viewSession: AuthSessionSnapshot | null;
  listeners: Set<() => void>;
}

function readToken(value: string | null): string | null {
  if (!value) return null;
  try {
    const user: unknown = JSON.parse(value);
    return typeof user === 'object' &&
      user !== null &&
      'token' in user &&
      typeof user.token === 'string' &&
      user.token
      ? user.token
      : null;
  } catch {
    return null;
  }
}

function reconcile(runtime: AuthRuntime, invalidate = false): AuthSessionSnapshot {
  const token = readToken(localStorage.getItem(USER_KEY));
  const marker = localStorage.getItem(SESSION_KEY);
  if (invalidate || runtime.snapshot.token !== token || runtime.marker !== marker) {
    runtime.snapshot = { token, revision: runtime.snapshot.revision + 1 };
    runtime.marker = marker;
  }
  return runtime.snapshot;
}

function getRuntime(): AuthRuntime {
  // Federated bundles share one session owner and one pair of browser listeners.
  const host = globalThis as typeof globalThis & { [RUNTIME_KEY]?: AuthRuntime };
  if (host[RUNTIME_KEY]) return host[RUNTIME_KEY];
  const runtime: AuthRuntime = {
    snapshot: { token: readToken(localStorage.getItem(USER_KEY)), revision: 0 },
    marker: localStorage.getItem(SESSION_KEY),
    viewSession: null,
    listeners: new Set(),
  };
  host[RUNTIME_KEY] = runtime;
  const notify = () => {
    for (const listener of runtime.listeners) listener();
  };
  window.addEventListener(AUTH_CHANGED_EVENT, () => {
    reconcile(runtime);
    notify();
  });
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStorage) return;
    if (event.key !== USER_KEY && event.key !== SESSION_KEY && event.key !== null) return;
    // Consume the transition as well as the final value: queued A -> B -> A events
    // must invalidate old A work, including writes from an older application tab.
    const identityChanged =
      event.key === null ||
      (event.key === USER_KEY && readToken(event.oldValue) !== readToken(event.newValue));
    reconcile(runtime, identityChanged);
    notify();
  });
  return runtime;
}

export function captureAuthSession(): AuthSessionSnapshot {
  return reconcile(getRuntime());
}

export function isCurrentAuthSession(session: AuthSessionSnapshot): boolean {
  const current = captureAuthSession();
  return session.revision === current.revision && session.token === current.token;
}

/** Requests belong to the last committed view, even before storage events arrive. */
export function captureRequestAuthSession(): AuthSessionSnapshot {
  const runtime = getRuntime();
  return runtime.viewSession ?? captureAuthSession();
}

/** Called by the shared boundary after the old view has been removed. */
export function commitAuthViewSession(session: AuthSessionSnapshot): void {
  if (isCurrentAuthSession(session)) getRuntime().viewSession = session;
}

export function subscribeAuthChanges(listener: () => void): () => void {
  const runtime = getRuntime();
  runtime.listeners.add(listener);
  return () => runtime.listeners.delete(listener);
}

// Token管理
export const authUtils = {
  // 检查是否已登录
  isAuthenticated(): boolean {
    return !!this.getUserInfo()?.token;
  },

  // 设置用户信息
  setUserInfo(userInfo: UserInfo) {
    if (captureAuthSession().token !== (userInfo.token || null)) {
      // Rotate before changing credentials, so a delayed storage event cannot
      // revive an earlier session with the same token (A -> B -> A).
      localStorage.setItem(SESSION_KEY, crypto.randomUUID());
    }
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
    captureAuthSession();
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  },

  // 获取用户信息
  getUserInfo(): UserInfo | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // 移除用户信息
  removeUserInfo() {
    if (captureAuthSession().token !== null) {
      localStorage.setItem(SESSION_KEY, crypto.randomUUID());
    }
    localStorage.removeItem(USER_KEY);
    captureAuthSession();
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  },

  // 登出（清理所有认证信息）
  logout() {
    this.removeUserInfo();
  },

  // 获取Authorization头
  getAuthHeader(): { Authorization: string } | Record<string, never> {
    const token = this.getUserInfo()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};
