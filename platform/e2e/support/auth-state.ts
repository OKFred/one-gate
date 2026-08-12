import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';
import { PLATFORM_ROOT } from './test-environment.js';

type PlaywrightStorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

/** 单个 Origin 的 sessionStorage 快照。 */
export type SessionStorageSnapshot = Record<string, string>;

/** 可由 Playwright 完整恢复的 Hodor 本地认证状态 Bundle。 */
export interface HodorAuthBundle {
  version: 1;
  savedAtUtc: string;
  storageState: PlaywrightStorageState;
  sessionStorageByOrigin: Record<string, SessionStorageSnapshot>;
}

export const HODOR_AUTH_STATE_PATH = path.join(
  PLATFORM_ROOT,
  'playwright/.auth/hodor.auth-state.json',
);

/** 判断未知值是否为普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 判断未知值是否为字符串字典。 */
function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

/** 对磁盘 JSON 执行最小结构校验，拒绝损坏或非本工具生成的文件。 */
function isHodorAuthBundle(value: unknown): value is HodorAuthBundle {
  if (!isRecord(value) || value.version !== 1) return false;
  if (typeof value.savedAtUtc !== 'string' || !isRecord(value.storageState)) {
    return false;
  }
  if (
    !Array.isArray(value.storageState.cookies) ||
    !Array.isArray(value.storageState.origins) ||
    !isRecord(value.sessionStorageByOrigin)
  ) {
    return false;
  }
  return Object.values(value.sessionStorageByOrigin).every(isStringRecord);
}

/** 读取认证 Bundle；文件不存在时返回 undefined，格式错误时明确失败。 */
export function readAuthBundle(): HodorAuthBundle | undefined {
  if (!existsSync(HODOR_AUTH_STATE_PATH)) return undefined;
  const raw = requireReadAuthFile();
  const parsed: unknown = JSON.parse(raw);
  if (!isHodorAuthBundle(parsed)) {
    throw new Error(
      `认证状态格式无效，请删除后重新运行 pnpm test:e2e:auth：${HODOR_AUTH_STATE_PATH}`,
    );
  }
  return parsed;
}

/** 同步读取仅用于 Playwright 配置初始化，避免配置导出变为异步。 */
function requireReadAuthFile(): string {
  return readFileSync(HODOR_AUTH_STATE_PATH, 'utf8');
}

/** 读取必须存在的认证 Bundle，并提供清晰的恢复指引。 */
export function readRequiredAuthBundle(): HodorAuthBundle {
  const bundle = readAuthBundle();
  if (!bundle) {
    throw new Error(`缺少认证状态，请先运行 pnpm test:e2e:auth：${HODOR_AUTH_STATE_PATH}`);
  }
  return bundle;
}

/** 判断 Cookie Domain 是否会应用到允许的 Hodor Host。 */
function isAllowedCookieDomain(domain: string, allowedOrigins: readonly string[]): boolean {
  const normalized = domain.replace(/^\./, '').toLowerCase();
  return allowedOrigins.some((origin) => {
    const hostname = new URL(origin).hostname;
    return hostname === normalized || hostname.endsWith(`.${normalized}`);
  });
}

/** 过滤 OAuth 提供方状态，只保留 Hodor 相关 Cookie 与 Origin。 */
function filterStorageState(
  storageState: PlaywrightStorageState,
  allowedOrigins: readonly string[],
): PlaywrightStorageState {
  const allowedOriginSet = new Set<string>(allowedOrigins);
  return {
    ...storageState,
    cookies: storageState.cookies.filter((cookie) =>
      isAllowedCookieDomain(cookie.domain, allowedOrigins),
    ),
    origins: storageState.origins.filter((origin) => allowedOriginSet.has(origin.origin)),
  };
}

/** 采集允许 Origin 的 sessionStorage，不读取其他 OAuth Origin。 */
async function captureSessionStorage(
  context: BrowserContext,
  allowedOrigins: readonly string[],
): Promise<Record<string, SessionStorageSnapshot>> {
  const result: Record<string, SessionStorageSnapshot> = {};
  for (const origin of allowedOrigins) {
    const existingPage = context.pages().find((page) => page.url().startsWith(`${origin}/`));
    if (!existingPage) {
      result[origin] = {};
      continue;
    }
    result[origin] = await existingPage.evaluate(() =>
      Object.fromEntries(
        Array.from({ length: sessionStorage.length }, (_, index) => {
          const key = sessionStorage.key(index) ?? '';
          return [key, sessionStorage.getItem(key) ?? ''];
        }).filter(([key]) => key.length > 0),
      ),
    );
  }
  return result;
}

/** 将全部 Hodor 登录状态原子写入单一 JSON Bundle。 */
export async function saveAuthBundle(
  context: BrowserContext,
  allowedOrigins: readonly string[],
): Promise<void> {
  const storageState = filterStorageState(
    await context.storageState({ indexedDB: true }),
    allowedOrigins,
  );
  const bundle: HodorAuthBundle = {
    version: 1,
    savedAtUtc: new Date().toISOString(),
    storageState,
    sessionStorageByOrigin: await captureSessionStorage(context, allowedOrigins),
  };
  await mkdir(path.dirname(HODOR_AUTH_STATE_PATH), { recursive: true });
  const temporaryPath = `${HODOR_AUTH_STATE_PATH}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, HODOR_AUTH_STATE_PATH);
  await chmod(HODOR_AUTH_STATE_PATH, 0o600).catch(() => undefined);
}

/** 异步读取认证文件，供测试诊断使用且不暴露内容。 */
export async function authStateFileExists(): Promise<boolean> {
  try {
    await readFile(HODOR_AUTH_STATE_PATH, 'utf8');
    return true;
  } catch {
    return false;
  }
}
