import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { initialMenuData } from "../../packages/core/src/db/initMenu";
import { initialLanguageData } from "../../packages/core/src/db/initLanguage";
import { initialRegionData } from "../../packages/core/src/db/initRegion";
import { initialTranslationData } from "../../packages/core/src/db/initTranslation";
import { permissionSeeds } from "../../packages/core/src/constants/permissions";
import { hashPassword } from "../../packages/core/src/utils/crypto";
import { validatePostgresSchema } from "../../packages/core/src/db/postgresql/runtime";
import {
  createPostgresToolClient,
  migratePostgres,
  postgresToolOptions,
  type PostgresMigrationClient,
} from "./migrate";

const supportedBusinesses = [
  "admin.system",
  "admin.i18n",
  "admin.base.sys_config",
  "admin.base.log",
  "admin.maintenance.recycle_bin",
  "admin.maintenance.compliance",
  "personal.base.user_config",
  "personal.base.preference",
  "enterprise.tenant",
  "enterprise.asset",
] as const;
const supportedPaths = new Set([
  "/home",
  "/me",
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
  "/admin/maintenance/recycle-bin",
  "/enterprise/tenant",
  "/enterprise/asset",
]);

function supported(business: string) {
  return supportedBusinesses.some(
    (prefix) => business === prefix || business.startsWith(`${prefix}.`)
  );
}

export function postgresPermissionSeeds() {
  const rows: { code: string; business: string; name: string }[] = [];
  function visit(value: unknown, path: string[]) {
    if (Array.isArray(value)) {
      const business = path.join(".");
      if (!supported(business)) return;
      for (const action of value) {
        if (typeof action !== "string")
          throw new Error("Invalid permission seed action");
        const code = `${business}:${action}`;
        rows.push({ code, business, name: code });
      }
    } else if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value))
        visit(child, [...path, key]);
    }
  }
  visit(permissionSeeds, []);
  if (new Set(rows.map((row) => row.code)).size !== rows.length)
    throw new Error("Duplicate permission seed");
  return rows;
}

export function postgresMenuSeeds() {
  const wanted = new Set(
    initialMenuData
      .filter(
        (row) => "path" in row && row.path && supportedPaths.has(row.path)
      )
      .map((row) => row.id)
  );
  let previous = 0;
  while (wanted.size !== previous) {
    previous = wanted.size;
    for (const row of initialMenuData) {
      if (wanted.has(row.id) && "parentId" in row && row.parentId)
        wanted.add(row.parentId);
    }
  }
  return initialMenuData.filter((row) => wanted.has(row.id));
}

type SeedTable =
  | "system_role"
  | "system_user"
  | "system_menu"
  | "system_permission"
  | "system_role_permission"
  | "i18n_language"
  | "i18n_region"
  | "i18n_translation";
type SeedValue = string | number | boolean | null;

async function insertMissing(
  client: PostgresMigrationClient,
  table: SeedTable,
  columns: readonly string[],
  rows: readonly (readonly SeedValue[])[]
) {
  if (columns.some((column) => !/^[a-z][a-z0-9_]*$/.test(column)))
    throw new Error("Invalid seed column");
  const names = columns.map((column) => `"${column}"`).join(",");
  const parameters = columns.map((_column, index) => `$${index + 1}`).join(",");
  let inserted = 0;
  for (const values of rows) {
    if (values.length !== columns.length)
      throw new Error("Invalid seed row width");
    const result = await client.query(
      `INSERT INTO "${table}" (${names}) VALUES (${parameters}) ON CONFLICT DO NOTHING`,
      [...values]
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}

async function raiseSeedSequences(
  client: PostgresMigrationClient,
  schema: string
) {
  const tables: SeedTable[] = [
    "system_user",
    "system_role",
    "system_menu",
    "system_permission",
    "system_role_permission",
    "i18n_language",
    "i18n_region",
    "i18n_translation",
  ];
  for (const table of tables) {
    const sequence = `${schema}.${table}_id_seq`;
    const prior = await client.query<{ last_value: string }>(
      `SELECT last_value::text FROM "${schema}"."${table}_id_seq"`
    );
    await client.query(
      `SELECT setval($1::regclass,GREATEST((SELECT COALESCE(MAX(id),1) FROM "${table}"),$2::bigint),true)`,
      [sequence, prior.rows[0].last_value]
    );
  }
}

export interface PostgresSeedOptions {
  schema: string;
  apply?: boolean;
  admin?: { username: string; password: string };
}

export async function seedPostgres(
  client: PostgresMigrationClient,
  options: PostgresSeedOptions
) {
  const schema = validatePostgresSchema(options.schema);
  if ((await migratePostgres(client, { schema })) === "pending")
    throw new Error("Apply the PostgreSQL migration before seeding");
  const menus = postgresMenuSeeds();
  const permissions = postgresPermissionSeeds();
  const translations = initialTranslationData
    .filter(
      (row) =>
        row.application === "backend" &&
        (supported(row.business) || row.business === "business.exception")
    )
    .flatMap((row) =>
      Object.entries(row.langCodes).map(([langCode, value]) => ({
        ...row,
        langCode,
        value,
      }))
    );
  await client.query(options.apply ? "BEGIN" : "BEGIN READ ONLY");
  try {
    await client.query(`SET LOCAL search_path TO "${schema}", pg_catalog`);
    await client.query("SET LOCAL statement_timeout='30s'");
    if (options.apply) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`one-gate:migration:${schema}`]
      );
      const guard = await client.query(
        "SELECT id FROM one_gate_write_guard WHERE id=1 FOR UPDATE"
      );
      if (guard.rows.length !== 1)
        throw new Error("PostgreSQL write guard missing");
    }
    const existingMenus = await client.query<{
      id: string;
      path: string | null;
      business: string;
    }>(
      "SELECT id::text,path,business FROM system_menu WHERE id=ANY($1::bigint[])",
      [menus.map((row) => row.id)]
    );
    for (const row of menus) {
      const existing = existingMenus.rows.find(
        (item) => item.id === String(row.id)
      );
      if (
        existing &&
        (existing.path !== ("path" in row ? (row.path ?? null) : null) ||
          existing.business !== row.business)
      )
        throw new Error("PostgreSQL seed menu ID collision");
    }
    const role = await client.query<{
      is_deleted: boolean;
      is_enabled: boolean;
      data_scope: string;
    }>("SELECT is_deleted,is_enabled,data_scope FROM system_role WHERE id=1");
    if (
      role.rows.length &&
      (role.rows[0].is_deleted ||
        !role.rows[0].is_enabled ||
        role.rows[0].data_scope !== "all")
    )
      throw new Error("Existing platform role requires manual review");
    const currentCodes = await client.query<{ code: string }>(
      "SELECT code FROM system_permission"
    );
    const currentLanguages = await client.query<{ key: string }>(
      "SELECT lang_code AS key FROM i18n_language"
    );
    const currentRegions = await client.query<{ key: string }>(
      "SELECT alpha2_code AS key FROM i18n_region"
    );
    const currentTranslations = await client.query<{ key: string }>(
      "SELECT t_key||chr(31)||lang_code AS key FROM i18n_translation"
    );
    const currentBindings = await client.query<{ code: string }>(
      "SELECT p.code FROM system_role_permission rp JOIN system_permission p ON p.id=rp.permission_id WHERE rp.role_id=1"
    );
    const existingAdmin = await client.query<{ username: string }>(
      'SELECT username FROM "system_user" WHERE id=1'
    );
    if (
      options.admin &&
      existingAdmin.rows.length &&
      existingAdmin.rows[0].username !== options.admin.username
    )
      throw new Error(
        "Existing platform account is preserved; bootstrap ID collision"
      );
    const missing = {
      role: role.rows.length ? 0 : 1,
      admin: existingAdmin.rows.length ? 0 : 1,
      menus: menus.length - existingMenus.rows.length,
      permissions: permissions.filter(
        (row) => !currentCodes.rows.some((item) => item.code === row.code)
      ).length,
      languages: initialLanguageData.filter(
        (row) =>
          !currentLanguages.rows.some((item) => item.key === row.langCode)
      ).length,
      regions: initialRegionData.filter(
        (row) =>
          !currentRegions.rows.some((item) => item.key === row.alpha2Code)
      ).length,
      translations: translations.filter(
        (row) =>
          !currentTranslations.rows.some(
            (item) => item.key === `${row.tKey}\u001f${row.langCode}`
          )
      ).length,
      rolePermissions: permissions.filter(
        (row) => !currentBindings.rows.some((item) => item.code === row.code)
      ).length,
    };
    const metadataMissing = Object.entries(missing).some(
      ([key, value]) => key !== "admin" && value > 0
    );
    if (!options.apply) {
      await client.query("COMMIT");
      return {
        status: metadataMissing || missing.admin ? "pending" : "current",
        missing,
        createdAdmin: false,
      };
    }
    if (!metadataMissing && (!options.admin || !missing.admin)) {
      await client.query("COMMIT");
      return {
        status: missing.admin ? "pending_admin" : "current",
        missing,
        createdAdmin: false,
      };
    }
    const now = Date.now();
    const audit = [1, null, now, null] as const;
    await insertMissing(
      client,
      "system_role",
      [
        "id",
        "name",
        "remark",
        "is_enabled",
        "permission_count",
        "data_scope",
        "custom_dept_ids",
        "creator_id",
        "updater_id",
        "create_time_utc",
        "update_time_utc",
        "is_deleted",
        "deleted_time_utc",
        "deleter_id",
      ],
      [
        [
          1,
          "Super administrator",
          "One Gate initial platform role",
          true,
          0,
          "all",
          null,
          ...audit,
          false,
          null,
          null,
        ],
      ]
    );
    await insertMissing(
      client,
      "i18n_language",
      [
        "lang_code",
        "native_name",
        "is_enabled",
        "sort_order",
        "remark",
        "creator_id",
        "updater_id",
        "create_time_utc",
        "update_time_utc",
      ],
      initialLanguageData.map((row) => [
        row.langCode,
        row.nativeName,
        row.isEnabled,
        row.sortOrder,
        null,
        ...audit,
      ])
    );
    await insertMissing(
      client,
      "i18n_region",
      [
        "labels",
        "alpha2_code",
        "alpha3_code",
        "numeric",
        "iso_3166_independent",
        "business_languages",
        "is_enabled",
        "remark",
        "creator_id",
        "updater_id",
        "create_time_utc",
        "update_time_utc",
      ],
      initialRegionData.map((row) => [
        JSON.stringify({ "zh-CN": row.label_zhCN, "en-US": row.label_enUS }),
        row.alpha2Code,
        row.alpha3Code,
        row.numeric,
        row.ISO3166Independent,
        null,
        true,
        null,
        ...audit,
      ])
    );
    await insertMissing(
      client,
      "system_permission",
      [
        "code",
        "name",
        "category",
        "resource",
        "business",
        "remark",
        "is_enabled",
        "creator_id",
        "updater_id",
        "create_time_utc",
        "update_time_utc",
      ],
      permissions.map((row) => [
        row.code,
        row.name,
        "action",
        null,
        row.business,
        null,
        true,
        ...audit,
      ])
    );
    await insertMissing(
      client,
      "system_menu",
      [
        "id",
        "name",
        "icon",
        "path",
        "parent_id",
        "sort",
        "business",
        "remark",
        "is_enabled",
        "creator_id",
        "updater_id",
        "create_time_utc",
        "update_time_utc",
      ],
      menus.map((row) => [
        row.id,
        row.name,
        row.icon,
        "path" in row ? (row.path ?? null) : null,
        "parentId" in row ? (row.parentId ?? null) : null,
        row.sort,
        row.business,
        null,
        true,
        ...audit,
      ])
    );
    await insertMissing(
      client,
      "i18n_translation",
      [
        "application",
        "business",
        "lang_code",
        "t_key",
        "t_value",
        "value_hash",
        "remark",
        "is_enabled",
        "creator_id",
        "updater_id",
        "create_time_utc",
        "update_time_utc",
      ],
      translations.map((row) => [
        row.application,
        row.business,
        row.langCode,
        row.tKey,
        row.value,
        createHash("sha256").update(row.value).digest("hex"),
        null,
        row.isEnabled,
        ...audit,
      ])
    );
    for (const permission of permissions)
      await client.query(
        `INSERT INTO system_role_permission (role_id,permission_id,creator_id,updater_id,create_time_utc,update_time_utc)
      SELECT 1,p.id,1,NULL,$2,NULL FROM system_permission p WHERE p.code=$1
      AND NOT EXISTS (SELECT 1 FROM system_role_permission rp WHERE rp.role_id=1 AND rp.permission_id=p.id)`,
        [permission.code, now]
      );
    await client.query(
      "UPDATE system_role SET permission_count=(SELECT count(*) FROM system_role_permission WHERE role_id=1),updater_id=1,update_time_utc=$1 WHERE id=1",
      [now]
    );
    let createdAdmin = false;
    if (options.admin && missing.admin) {
      if (!options.admin.username.trim() || options.admin.password.length < 12)
        throw new Error(
          "Explicit admin credentials with a password of at least 12 characters are required"
        );
      const hash = await hashPassword(options.admin.password);
      const inserted = await insertMissing(
        client,
        "system_user",
        [
          "id",
          "username",
          "password",
          "lang_code",
          "remark",
          "region_id",
          "department_id",
          "role_id_arr",
          "is_enabled",
          "creator_id",
          "updater_id",
          "create_time_utc",
          "update_time_utc",
        ],
        [
          [
            1,
            options.admin.username,
            hash,
            "en-US",
            "Explicit One Gate bootstrap account",
            null,
            null,
            "[1]",
            true,
            ...audit,
          ],
        ]
      );
      if (inserted !== 1)
        throw new Error(
          "Platform account creation conflicted; no existing credentials changed"
        );
      createdAdmin = true;
    }
    await raiseSeedSequences(client, schema);
    await client.query("COMMIT");
    return {
      status: missing.admin && !createdAdmin ? "pending_admin" : "applied",
      missing,
      createdAdmin,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const createAdmin = args.includes("--create-admin");
  const options = postgresToolOptions(
    args.filter((arg) => arg !== "--create-admin")
  );
  if (args.filter((arg) => arg === "--create-admin").length > 1)
    throw new Error("Duplicate admin flag");
  let admin: PostgresSeedOptions["admin"];
  if (createAdmin) {
    if (!options.apply)
      throw new Error("Admin bootstrap requires explicit --apply");
    const username = process.env.PG_SEED_ADMIN_USERNAME;
    const password = process.env.PG_SEED_ADMIN_PASSWORD;
    if (!username || !password)
      throw new Error("Private PG_SEED_ADMIN_USERNAME/PASSWORD are required");
    admin = { username, password };
  }
  const client = createPostgresToolClient();
  try {
    await client.connect();
    console.log(
      JSON.stringify({
        schema: options.schema,
        ...(await seedPostgres(client, { ...options, admin })),
      })
    );
  } finally {
    await client.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch(() => {
    console.error(
      "PostgreSQL seed/check did not complete; existing accounts and credentials are preserved"
    );
    process.exitCode = 1;
  });
}
