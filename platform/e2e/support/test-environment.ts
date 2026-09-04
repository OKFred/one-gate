import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const PLAYWRIGHT_ENV_PREFIX = 'HODOR_E2E_';
const PLAYWRIGHT_ENV_MODE = 'playwright';

export const PLATFORM_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

export interface HodorE2EEnvironment {
  baseUrl: string;
  allowedOrigins: readonly string[];
  expectedDeviceClientId?: string;
  mockAuth: boolean;
}

/** 将部署地址归一化为不包含路径、查询或凭证的 HTTP(S) Origin。 */
function parseHttpOrigin(rawValue: string, variableName: string): string {
  const value = rawValue.trim();
  if (!value) {
    throw new Error(
      `缺少 ${variableName}，请复制 .env.playwright.example 为 .env.playwright.local 后配置部署地址`,
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} 不是有效 URL：${value}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${variableName} 仅支持 HTTP(S) URL：${value}`);
  }
  if (url.username || url.password) {
    throw new Error(`${variableName} 不允许包含用户名或密码`);
  }
  return url.origin;
}

/** 读取 shell 环境变量，未提供时回退到 .env.playwright.local。 */
function resolveValue(loadedEnv: Record<string, string>, variableName: string): string {
  return process.env[variableName] ?? loadedEnv[variableName] ?? '';
}

/** 加载与具体部署解耦的 Playwright E2E 环境。 */
export function readE2EEnvironment(): HodorE2EEnvironment {
  const loadedEnv = loadEnv(PLAYWRIGHT_ENV_MODE, PLATFORM_ROOT, PLAYWRIGHT_ENV_PREFIX);
  const baseUrl = parseHttpOrigin(
    resolveValue(loadedEnv, 'HODOR_E2E_BASE_URL'),
    'HODOR_E2E_BASE_URL',
  );
  const configuredOrigins = resolveValue(loadedEnv, 'HODOR_E2E_ALLOWED_ORIGINS')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => parseHttpOrigin(value, 'HODOR_E2E_ALLOWED_ORIGINS'));
  const allowedOrigins = [...new Set([baseUrl, ...configuredOrigins])];
  const expectedDeviceClientId = resolveValue(loadedEnv, 'HODOR_E2E_DEVICE_CLIENT_ID').trim();
  const mockAuth = resolveValue(loadedEnv, 'HODOR_E2E_MOCK_AUTH').trim() === 'true';

  return {
    baseUrl,
    allowedOrigins,
    mockAuth,
    ...(expectedDeviceClientId ? { expectedDeviceClientId } : {}),
  };
}
