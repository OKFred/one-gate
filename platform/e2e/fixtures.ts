import { test as base, expect } from '@playwright/test';
import { readRequiredAuthBundle } from './support/auth-state.js';

interface SessionStorageFixtures {
  restoreSessionStorage: void;
}

/** 自动在应用脚本执行前恢复同一 Bundle 中的 sessionStorage。 */
export const test = base.extend<SessionStorageFixtures>({
  restoreSessionStorage: [
    async ({ context }, use) => {
      const { sessionStorageByOrigin } = readRequiredAuthBundle();
      await context.addInitScript((storageByOrigin) => {
        const snapshot = storageByOrigin[window.location.origin];
        if (!snapshot) return;
        for (const [key, value] of Object.entries(snapshot)) {
          window.sessionStorage.setItem(key, value);
        }
      }, sessionStorageByOrigin);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
