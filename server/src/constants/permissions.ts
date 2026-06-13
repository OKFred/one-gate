import { BusinessKey } from "../types/business";

export type PermissionAction =
  | "read"
  | "add"
  | "edit"
  | "delete"
  | "export"
  | "view"
  | "batch-delete"
  | "update_profile"
  | "update_password";

export type CheckPermissionSeeds<T> = {
  [P in keyof T & string]: {
    [M in keyof T[P] & string]: (
      M extends "" ? P : `${P}.${M}`
    ) extends BusinessKey
      ? readonly PermissionAction[]
      : never;
  };
};

export const permissionSeeds = {
  system: {
    "": ["read"],
    user: ["read", "add", "edit", "delete", "export"],
    role: ["read", "add", "edit", "delete"],
    permission: ["read", "add", "edit", "delete"],
    department: ["read", "add", "edit", "delete"],
    menu: ["read", "add", "edit", "delete"],
    role_permission: ["read", "add", "edit", "delete", "batch-delete"],
    auth: ["read", "update_profile", "update_password"],
    schema_form: ["read", "add", "edit", "delete"],
    schema_form_data: ["read", "add", "edit", "delete"],
  },
  mail: {
    "": ["read"],
    account: ["read", "add", "edit", "delete"],
    template: ["read", "add", "edit", "delete"],
    log: ["read", "view"],
  },
  i18n: {
    "": ["read"],
    language: ["read", "add", "edit", "delete"],
    region: ["read", "add", "edit", "delete"],
    translation: ["read", "add", "edit", "delete"],
  },
  maintenance: {
    "": ["read"],
    cache: ["read", "add", "edit", "delete", "view"],
    audit_login: ["read"],
    cron: ["read", "add", "edit", "delete"],
    api_task: ["read", "add", "edit", "delete"],
    api_docs: ["read", "add", "edit", "delete"],
  },
  oss: {
    "": ["read"],
    config: ["read", "add", "edit", "delete"],
    file: ["read", "add", "edit", "delete"],
  },
  enterprise: {
    "": ["read"],
    attendance: ["read", "add", "edit", "delete"],
  },
  ai: {
    "": ["read"],
    config: ["read", "add", "edit", "delete"],
    chat: ["read"],
  },
  swarm: {
    "": ["read"],
    docker: ["read", "add", "edit", "delete"],
    docker_config: ["read", "add", "edit", "delete"],
    nodes: ["read"],
  },
} as const;

// Ensure type safety of permissionSeeds against BusinessKey mapping
const _checkPermissionSeeds: CheckPermissionSeeds<typeof permissionSeeds> =
  permissionSeeds;
