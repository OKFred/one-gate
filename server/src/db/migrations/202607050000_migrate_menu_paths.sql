-- 1. 基础设施模块路由更新 (system, i18n, mail, maintenance, oss, swarm)
UPDATE system_menu 
SET path = '/infra' || path 
WHERE path LIKE '/system/%' 
   OR path LIKE '/i18n/%' 
   OR path LIKE '/mail/%' 
   OR path LIKE '/maintenance/%' 
   OR path LIKE '/oss/%'
   OR path LIKE '/swarm/%';

-- 2. 业务模块路由更新 (enterprise, ai)
UPDATE system_menu 
SET path = '/biz' || path 
WHERE path LIKE '/enterprise/%' 
   OR path LIKE '/ai/%';
