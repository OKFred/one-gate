-- Read-only asset release metadata contract. The preflight command interprets every result.
-- A disabled/customized item is reported; this contract never repairs or overwrites it.
WITH expected_menus(id, path, business) AS (
  VALUES (108, '/enterprise/tenant', 'enterprise.tenant'),
         (109, '/enterprise/asset', 'enterprise.asset')
), expected_permissions(code, business) AS (
  VALUES ('enterprise.tenant:read', 'enterprise.tenant'),
         ('enterprise.tenant:add', 'enterprise.tenant'),
         ('enterprise.tenant:edit', 'enterprise.tenant'),
         ('enterprise.asset:read', 'enterprise.asset'),
         ('enterprise.asset:add', 'enterprise.asset'),
         ('enterprise.asset:edit', 'enterprise.asset'),
         ('enterprise.asset.mapping:read', 'enterprise.asset.mapping')
)
SELECT 'menu:' || expected.id AS check_key,
       CASE WHEN actual.id IS NULL THEN 'MENU_MISSING'
            WHEN actual.path IS NOT expected.path OR actual.business IS NOT expected.business OR actual.parent_id IS NOT 26 THEN 'MENU_CONFLICT'
            WHEN actual.is_enabled IS NOT 1 THEN 'MENU_DISABLED'
            WHEN parent.id IS NULL OR parent.is_enabled IS NOT 1 OR parent.business IS NOT 'enterprise' THEN 'MENU_PARENT_UNAVAILABLE'
            ELSE 'READY' END AS code
FROM expected_menus expected LEFT JOIN system_menu actual ON actual.id = expected.id
LEFT JOIN system_menu parent ON parent.id = 26
UNION ALL
SELECT 'permission:' || expected.code,
       CASE WHEN actual.id IS NULL THEN 'PERMISSION_MISSING'
            WHEN actual.business IS NOT expected.business OR actual.category IS NOT 'action' THEN 'PERMISSION_CONFLICT'
            WHEN actual.is_enabled IS NOT 1 THEN 'PERMISSION_DISABLED'
            ELSE 'READY' END
FROM expected_permissions expected LEFT JOIN system_permission actual ON actual.code = expected.code
UNION ALL
SELECT 'role:1',
       CASE WHEN actual.id IS NULL THEN 'PLATFORM_ROLE_MISSING'
            WHEN actual.is_enabled IS NOT 1 OR actual.is_deleted IS NOT 0 THEN 'PLATFORM_ROLE_INACTIVE'
            ELSE 'READY' END
FROM (SELECT 1) expected LEFT JOIN system_role actual ON actual.id = 1
UNION ALL
SELECT 'grant:' || expected.code,
       CASE WHEN permission.id IS NULL THEN 'ROLE_GRANT_UNVERIFIABLE'
            WHEN actual.role_id IS NULL THEN 'ROLE_GRANT_MISSING'
            ELSE 'READY' END
FROM expected_permissions expected
LEFT JOIN system_permission permission ON permission.code = expected.code
LEFT JOIN system_role_permission actual ON actual.role_id = 1 AND actual.permission_id = permission.id;
