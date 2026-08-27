import type { App } from "../../types/app";
import { cors } from "hono/cors";
import { getEnv } from "../../utils/env";

const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function normalizeConfiguredOrigin(
  value: string,
  environment: string | undefined
): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.origin !== value ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    if (environment === "production") {
      return url.protocol === "https:" ? url.origin : undefined;
    }
    return LOCAL_DEVELOPMENT_HOSTS.has(url.hostname) ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export function resolveAllowedWebOrigins(
  configuredOrigins: string | undefined,
  environment: string | undefined
): readonly string[] {
  if (!configuredOrigins?.trim()) return [];
  return Object.freeze(
    Array.from(
      new Set(
        configuredOrigins
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => normalizeConfiguredOrigin(value, environment))
          .filter((value): value is string => value !== undefined)
      )
    )
  );
}

export default function corsHandler(app: App) {
  const allowedOrigins = resolveAllowedWebOrigins(
    getEnv("HODOR_ALLOWED_WEB_ORIGINS"),
    getEnv("NODE_ENV")
  );
  app.use(
    getEnv("BASE_API_PATH") + "/*",
    cors({
      origin: (origin) =>
        allowedOrigins.includes(origin) ? origin : undefined,
      allowMethods: ["POST", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
      exposeHeaders: ["X-Request-Id"],
      credentials: true,
      maxAge: 600,
    })
  );
}
