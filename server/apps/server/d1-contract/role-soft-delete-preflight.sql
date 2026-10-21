-- Read-only counts. Repair every nonzero category before opening upgraded writes.
WITH user_roles AS (
  SELECT `id`,
    CASE WHEN json_valid(`role_id_arr`) THEN json_type(`role_id_arr`) = 'array' ELSE 0 END AS valid_array,
    CASE WHEN json_valid(`role_id_arr`) THEN CASE WHEN json_type(`role_id_arr`) = 'array' THEN `role_id_arr` ELSE '[]' END ELSE '[]' END AS ids
  FROM `system_user`
), role_departments AS (
  SELECT `id`,
    CASE WHEN `custom_dept_ids` IS NULL THEN 1 WHEN json_valid(`custom_dept_ids`) THEN json_type(`custom_dept_ids`) = 'array' ELSE 0 END AS valid_array,
    CASE WHEN json_valid(`custom_dept_ids`) THEN CASE WHEN json_type(`custom_dept_ids`) = 'array' THEN `custom_dept_ids` ELSE '[]' END ELSE '[]' END AS ids
  FROM `system_role`
)
SELECT
  (SELECT COUNT(*) FROM user_roles WHERE valid_array = 0) AS user_role_arrays,
  (SELECT COUNT(*) FROM user_roles AS owner WHERE EXISTS (
    SELECT 1 FROM json_each(owner.ids) AS assigned
    WHERE assigned.type != 'integer' OR assigned.value <= 0 OR assigned.value > 9007199254740991
  )) AS user_role_ids,
  (SELECT COUNT(*) FROM user_roles AS owner WHERE EXISTS (
    SELECT 1 FROM json_each(owner.ids) AS assigned
    WHERE NOT EXISTS (SELECT 1 FROM `system_role` AS referenced WHERE referenced.id = assigned.value)
  )) AS user_role_orphans,
  (SELECT COUNT(*) FROM role_departments WHERE valid_array = 0) AS role_department_arrays,
  (SELECT COUNT(*) FROM role_departments AS owner WHERE EXISTS (
    SELECT 1 FROM json_each(owner.ids) AS assigned
    WHERE assigned.type != 'integer' OR assigned.value <= 0 OR assigned.value > 9007199254740991
  )) AS role_department_ids,
  (SELECT COUNT(*) FROM role_departments AS owner WHERE EXISTS (
    SELECT 1 FROM json_each(owner.ids) AS assigned
    WHERE NOT EXISTS (SELECT 1 FROM `system_department` AS referenced WHERE referenced.id = assigned.value)
  )) AS role_department_orphans,
  (SELECT COUNT(*) FROM `system_role_permission` AS binding
   WHERE NOT EXISTS (SELECT 1 FROM `system_role` AS referenced WHERE referenced.id = binding.role_id)) AS role_permission_orphans;
