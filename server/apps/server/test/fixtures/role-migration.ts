/** Synthetic old-schema fixture shared by real libSQL and local D1 tests. */
export const legacyRoleMigrationSql = `
CREATE TABLE system_role (
 id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL,
 remark TEXT, is_enabled INTEGER NOT NULL, permission_count INTEGER NOT NULL,
 data_scope TEXT NOT NULL, custom_dept_ids TEXT, creator_id INTEGER NOT NULL,
 updater_id INTEGER, create_time_utc INTEGER NOT NULL, update_time_utc INTEGER
);
CREATE UNIQUE INDEX system_role_name_unique ON system_role(name);
CREATE TABLE system_user (id INTEGER PRIMARY KEY, role_id_arr TEXT NOT NULL);
CREATE TABLE system_department (id INTEGER PRIMARY KEY);
CREATE TABLE system_role_permission (
 id INTEGER PRIMARY KEY AUTOINCREMENT, role_id INTEGER NOT NULL,
 permission_id INTEGER NOT NULL, creator_id INTEGER NOT NULL,
 updater_id INTEGER, create_time_utc INTEGER NOT NULL, update_time_utc INTEGER
);
INSERT INTO system_department VALUES (7);
INSERT INTO system_role VALUES (1,'Superadmin',NULL,1,0,'all',NULL,1,NULL,100,NULL);
INSERT INTO system_role VALUES (2,'Keep','original',0,1,'custom','[7]',7,8,100,101);
INSERT INTO system_role VALUES (900,'Removed',NULL,1,0,'all',NULL,7,NULL,100,NULL);
DELETE FROM system_role WHERE id=900;
INSERT INTO system_user VALUES (10,'[1]');
INSERT INTO system_role_permission VALUES (30,2,20,7,8,100,101);
`;

export const invalidRoleMigrationFixtures = [
  {
    sql: "UPDATE system_user SET role_id_arr='broken'",
    issue: "user_role_arrays",
  },
  { sql: "UPDATE system_user SET role_id_arr='{}'", issue: "user_role_arrays" },
  {
    sql: "UPDATE system_user SET role_id_arr='null'",
    issue: "user_role_arrays",
  },
  { sql: `UPDATE system_user SET role_id_arr='["1"]'`, issue: "user_role_ids" },
  { sql: "UPDATE system_user SET role_id_arr='[1.5]'", issue: "user_role_ids" },
  { sql: "UPDATE system_user SET role_id_arr='[0]'", issue: "user_role_ids" },
  {
    sql: "UPDATE system_user SET role_id_arr='[9007199254740992]'",
    issue: "user_role_ids",
  },
  {
    sql: "UPDATE system_user SET role_id_arr='[999]'",
    issue: "user_role_orphans",
  },
  {
    sql: "UPDATE system_role SET custom_dept_ids='broken' WHERE id=2",
    issue: "role_department_arrays",
  },
  {
    sql: "UPDATE system_role SET custom_dept_ids='{}' WHERE id=2",
    issue: "role_department_arrays",
  },
  {
    sql: `UPDATE system_role SET custom_dept_ids='["7"]' WHERE id=2`,
    issue: "role_department_ids",
  },
  {
    sql: "UPDATE system_role SET custom_dept_ids='[-1]' WHERE id=2",
    issue: "role_department_ids",
  },
  {
    sql: "UPDATE system_role SET custom_dept_ids='[8]' WHERE id=2",
    issue: "role_department_orphans",
  },
  {
    sql: "UPDATE system_role_permission SET role_id=999",
    issue: "role_permission_orphans",
  },
] as const;
