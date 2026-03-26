/**
 * Environment variables utility
 * Provides a unified way to access environment variables in both Node.js and Cloudflare Workers.
 */

// Initialized with process.env for Node.js compatibility
let envStore: any = typeof process !== 'undefined' ? process.env : {};

/**
 * Update the internal environment store.
 * In Cloudflare Workers, this should be called with c.env in a middleware.
 */
export function setEnv(newEnv: any) {
  envStore = { ...envStore, ...newEnv };
}

/**
 * Get an environment variable by key.
 */
export function getEnv(key: string): string | undefined {
  return envStore[key];
}

/**
 * Get all environment variables.
 */
export function getAllEnv(): any {
  return envStore;
}
