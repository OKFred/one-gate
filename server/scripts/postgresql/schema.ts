/** Tool-only registry. Core runtime never imports business packages. */
export * from "../../packages/core/src/db/postgresql/schema";
export * from "../../packages/admin/src/system/user/schema.pg";
export * from "../../packages/admin/src/system/role/schema.pg";
export * from "../../packages/admin/src/system/department/schema.pg";
export * from "../../packages/admin/src/system/permission/schema.pg";
export * from "../../packages/admin/src/system/role_permission/schema.pg";
export * from "../../packages/admin/src/system/api-token/schema.pg";
export * from "../../packages/admin/src/system/menu/schema.pg";
export * from "../../packages/admin/src/i18n/language/schema.pg";
export * from "../../packages/admin/src/i18n/region/schema.pg";
export * from "../../packages/admin/src/i18n/translation/schema.pg";
export * from "../../packages/admin/src/base/sys_config/schema.pg";
export * from "../../packages/admin/src/base/log/schema.pg";
export * from "../../packages/admin/src/maintenance/compliance/schema.pg";
export * from "../../packages/personal/src/base/user_config/schema.pg";
export * from "../../packages/enterprise/src/tenant/schema.pg";
export * from "../../packages/enterprise/src/asset/schema.pg";
