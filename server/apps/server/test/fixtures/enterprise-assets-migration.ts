export const existingBusinessSql = `
CREATE TABLE existing_business (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT NOT NULL);
INSERT INTO existing_business(id,value) VALUES (900,'preserve');
DELETE FROM existing_business;
INSERT INTO existing_business(id,value) VALUES (7,'unchanged');
`;

export const tenantFixtureSql = `
INSERT INTO enterprise_tenant (id,key,name,is_enabled,recovery_reason,creator_id,updater_id,create_time_utc,update_time_utc)
VALUES (1,'tenant-a','A',1,NULL,10,NULL,100,100),(2,'tenant-b','B',1,NULL,20,NULL,100,100);
INSERT INTO enterprise_asset (id,tenant_id,asset_id,asset_code,name,category,brand,model,remark,status,retired_time_utc,state_reason,creator_id,updater_id,create_time_utc,update_time_utc)
VALUES (1,1,'asset-a','A','Disk','disk',NULL,NULL,NULL,'active',NULL,NULL,10,NULL,100,NULL),
       (2,2,'asset-b','A','Host','host',NULL,NULL,NULL,'active',NULL,NULL,20,NULL,100,NULL);
`;

export const invalidEnterpriseSchemas = [
  {
    defect: "database defaults",
    change: (sql: string) =>
      sql.replace(
        "`is_enabled` integer NOT NULL",
        "`is_enabled` integer DEFAULT 1 NOT NULL"
      ),
  },
  {
    defect: "missing partial uniqueness",
    change: (sql: string) =>
      sql.replace(' WHERE "enterprise_asset_identifier"."is_verified" = 1', ""),
  },
  {
    defect: "incorrect interval index order",
    change: (sql: string) =>
      sql.replace(
        "(`tenant_id`,`asset_id`,`valid_from_utc`)",
        "(`asset_id`,`tenant_id`,`valid_from_utc`)"
      ),
  },
  {
    defect: "weakened status constraint",
    change: (sql: string) =>
      sql.replace(
        '"enterprise_asset"."retired_time_utc" IS NOT NULL',
        '"enterprise_asset"."retired_time_utc" IS NULL'
      ),
  },
] as const;

export function sqlStatements(sql: string): string[] {
  return sql
    .replace(/^--.*$/gm, "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}
import menuSql from "@hodor/core/db/sql/admin/system_menu.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import translationSql from "@hodor/core/db/sql/admin/i18n_translation.sql?raw";

export const existingMetadataSql =
  [menuSql, permissionSql, rolePermissionSql, roleSql, translationSql].join(
    "\n"
  ) +
  `
INSERT INTO system_role(id,name,is_enabled,permission_count,data_scope,creator_id,is_deleted) VALUES(1,'Platform',1,0,'all',1,0),(9,'Keep role',1,0,'all',1,0);
INSERT INTO system_menu(id,name,icon,path,parent_id,sort,business,is_enabled,creator_id) VALUES(107,'Existing recycle bin','keep','/admin/recycle-bin',19,7,'admin.maintenance.recycle_bin',1,1);
`;
