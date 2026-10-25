import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime.js";
import type { App } from "@hodor/core/types/app.js";

const supportedDomains = new Set([
  "/admin/system/user",
  "/admin/system/role",
  "/admin/system/department",
  "/admin/system/permission",
  "/admin/system/role_permission",
  "/admin/system/api-token",
  "/admin/system/menu",
  "/admin/i18n/language",
  "/admin/i18n/region",
  "/admin/i18n/translation",
  "/admin/base/sys_config",
  "/admin/base/log",
  "/admin/base/log/sys",
  "/admin/base/log/audit",
  "/admin/base/log/biz",
  "/admin/base/log/http",
  "/admin/maintenance/login_log",
  "/admin/maintenance/recycle-bin",
  "/admin/maintenance/cloudflare-usage",
  "/enterprise/tenant",
  "/enterprise/asset",
  "/enterprise/asset/mapping",
  "/personal/base/user_config",
]);

const supportedAuthActions = new Set([
  "login",
  "refresh",
  "check",
  "profile",
  "updateProfile",
  "updateLangCode",
  "updatePassword",
  "getButtonPermission",
]);

/** An explicit capability boundary; unported modules cannot reach a SQLite database. */
export function supportsPostgresPath(path: string): boolean {
  const split = path.lastIndexOf("/");
  const domain = path.slice(0, split);
  const action = path.slice(split + 1);
  if (domain === "/admin/system/auth") return supportedAuthActions.has(action);
  if (path.startsWith("/admin/system/auth/gate/"))
    return !action.includes("/") && domain === "/admin/system/auth/gate";
  return action.length > 0 && supportedDomains.has(domain);
}

export function registerPostgresCapabilities(
  app: App,
  baseApiPath: string
): void {
  app.use("*", async (context, next) => {
    if (!isPostgresBackend() || context.req.method === "OPTIONS") return next();
    const path = context.req.path;
    if (!path.startsWith(`${baseApiPath}/`)) return next();
    const apiPath = path.slice(baseApiPath.length);
    const machine = /^Bearer\s+hdr_/.test(
      context.req.header("authorization") || ""
    );
    if (
      !supportsPostgresPath(apiPath) ||
      (machine && !apiPath.startsWith("/enterprise/asset/mapping/"))
    ) {
      return context.json(
        {
          ok: false,
          code: "POSTGRESQL_CAPABILITY_UNAVAILABLE",
          message:
            "This operation is not available with the PostgreSQL backend.",
          data: {},
        },
        501
      );
    }
    return next();
  });
}
