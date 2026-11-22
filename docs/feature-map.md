# One Gate 功能地图 (Feature Map)

> 本文档由 `node scripts/generate-feature-map.mjs` 从 `@hodor/contracts`、三端 `pages/**/index.tsx`、`initMenu.ts` 与 `platform/e2e/` 自动生成；请勿手工修改。更新路由或契约后请执行 `pnpm run feature-map:generate`（或 `pnpm run sync:all`）。

## 全局规模概览

- **可访问页面路由总计**：`64` 个（纯 JSON 契约 `16` + 契约扩展壳 `18` + 自定义业务页 `30`）
- **嵌入式契约总计**：`4` 份（挂载于 `/admin/base/log` 多 Tab，不单独注册路由）
- **Playwright E2E 套件总计**：`21` 个

## 核心用户旅程 (Top Journeys)

| 旅程名称 | 主入口 | 关键路径与模块联动 | E2E 覆盖 |
| --- | --- | --- | --- |
| 登录与 TOTP 二次验证门禁 | `/login` | /login (密码 / SSO /sso/callback) -> TOTP Gate 验证 -> /home | `auth-ui.spec.ts`, `login-limit.spec.ts` |
| 工作台首页与 Cloudflare 状态摘要 | `/home` | /home 快捷入口卡片 & Cloudflare 单行摘要 (仅 >=80% 预警展开) -> /home?view=usage | `home-summary.spec.ts`, `cloudflare-home.spec.ts`, `usage-trend-math.spec.ts` |
| 个人日程与到期提醒 | `/calendar` | /home 日历快捷入口 -> /calendar 新建/编辑/确认提醒 & 订阅链接 | `calendar.spec.ts`, `subscription.spec.ts` |
| 天地图空间工作区 | `/home?view=map` | /home 天地图卡片 -> /home?view=map 底图切换/注记图层加载 | `tianditu.spec.ts` |
| 多模型 AI 对话助手 | `/admin/ai/chat` | /admin/ai/config 配置模型 -> /home AI 卡片或侧边栏 -> /admin/ai/chat 对话与模型切换 | `cloudflare-home.spec.ts` |
| 契约驱动 CRUD（列表/筛选/表单/详情） | `/admin/base/webhook_config` | buildContractRoutes 自动挂载 -> ContractCrudPage -> AJV (含 ajv-formats) 提交或 ContractDetailDialog | `contract-crud.spec.ts`, `crud-resource-switch.spec.ts`, `create-reveal.spec.ts` |
| 软删除与 30 天回收站撤销 | `/admin/system/role` | /admin/system/{role,department} 删除 -> 撤销 Snackbar 或 /admin/recycle-bin 恢复/彻底清除 | `delete-undo.spec.ts`, `role-delete-undo.spec.ts`, `recycle-bin.spec.ts`, `api-failure.spec.ts` |
| 企业多租户与资产台账 (Module Federation) | `/enterprise/asset` | admin Host MicroApp -> gate-enterprise /enterprise/tenant, /enterprise/asset, /enterprise/organization/attendance | `assets.spec.ts` |
| 个人资产空间与偏好设置 (Module Federation) | `/personal/asset` | admin Host MicroApp -> gate-personal /personal/asset, /personal/base/preference & 个人档案 | `personal-assets.spec.ts`, `personal-assets-model.spec.ts` |
| 移动端设备运维与异步任务运行时 | `/admin/mobile/async-task` | /admin/mobile/device (WebSocket Ops) -> /admin/mobile/app -> /admin/mobile/async-task 下发与状态轮询 | `device-tasks.spec.ts`, `hodor-device.spec.ts` |

## 管理端与通用路由 (`@hodor/web-admin`)（51 个路由）

| 路由 | 菜单 / 功能名 | 实现形态 | 源码 / 契约位置 | E2E 覆盖 |
| --- | --- | --- | --- | --- |
| `/admin/ai/chat` | 管理后台 / AI / AI 助手对话 | 自定义业务页 | `platform/apps/admin/src/pages/ai/chat/index.tsx` | `auth-ui.spec.ts`, `cloudflare-home.spec.ts` |
| `/admin/ai/config` | 管理后台 / AI / 模型配置 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/ai/config.json` | - |
| `/admin/ai/search` | 管理后台 / AI / 全局 AI 搜索 | 自定义业务页 | `platform/apps/admin/src/pages/ai/search/index.tsx` | - |
| `/admin/base/log` | 管理后台 / 底座 / 日志 | 自定义业务页 | `platform/apps/admin/src/pages/base/log/index.tsx` | - |
| `/admin/base/sys_config` | 管理后台 / 底座 / 系统配置底座 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/base/sys_config.json` | `role-delete-undo.spec.ts` |
| `/admin/base/webhook_config` | 管理后台 / 底座 / Webhook 配置 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/base/webhook_config.json` | - |
| `/admin/data/schema_form` | 管理后台 / 数据库 / 动态表单 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/data/schema_form.json` + `platform/apps/admin/src/pages/data/schema_form/index.tsx` | - |
| `/admin/data/schema_form_data` | 管理后台 / 数据库 / 表单数据 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/data/schema_form_data.json` + `platform/apps/admin/src/pages/data/schema_form_data/index.tsx` | - |
| `/admin/i18n/language` | 管理后台 / 国际化 / 语言 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/i18n/language.json` | - |
| `/admin/i18n/region` | 管理后台 / 国际化 / 国家地区 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/i18n/region.json` + `platform/apps/admin/src/pages/i18n/region/index.tsx` | - |
| `/admin/i18n/translation` | 管理后台 / 国际化 / 翻译 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/i18n/translation.json` + `platform/apps/admin/src/pages/i18n/translation/index.tsx` | - |
| `/admin/mail` | 邮件模块根重定向 | 自定义业务页 | `platform/apps/admin/src/pages/mail/index.tsx` | - |
| `/admin/mail/account` | 管理后台 / 邮件管理 / 账户 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/mail/account.json` | - |
| `/admin/mail/log` | 管理后台 / 邮件管理 / 日志 | 纯 JSON 契约（只读） | `packages/contracts/src/resources/admin/mail/log.json` | - |
| `/admin/mail/send` | 管理后台 / 邮件管理 / 发送 | 自定义业务页 | `platform/apps/admin/src/pages/mail/send/index.tsx` | - |
| `/admin/mail/template` | 管理后台 / 邮件管理 / 模板 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/mail/template.json` + `platform/apps/admin/src/pages/mail/template/index.tsx` | - |
| `/admin/maintenance/api-docs` | 管理后台 / 运维 / API 文档 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/maintenance/api-docs.json` + `platform/apps/admin/src/pages/maintenance/api-docs/index.tsx` | - |
| `/admin/maintenance/api-task` | 管理后台 / 运维 / API 采集任务 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/maintenance/api-task.json` + `platform/apps/admin/src/pages/maintenance/api-task/index.tsx` | - |
| `/admin/maintenance/cache` | 管理后台 / 运维 / 缓存 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/maintenance/cache.json` + `platform/apps/admin/src/pages/maintenance/cache/index.tsx` | - |
| `/admin/maintenance/cron` | 管理后台 / 运维 / 定时任务 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/maintenance/cron.json` + `platform/apps/admin/src/pages/maintenance/cron/index.tsx` | - |
| `/admin/maintenance/loginLog` | 管理后台 / 运维 / 登录日志 | 纯 JSON 契约（只读） | `packages/contracts/src/resources/admin/maintenance/loginLog.json` | - |
| `/admin/maintenance/openapi` | 管理后台 / 运维 / 接口文档 | 自定义业务页 | `platform/apps/admin/src/pages/maintenance/openapi/index.tsx` | - |
| `/admin/mobile/app` | 管理后台 / 移动端管理 / 应用管理 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/mobile/app.json` + `platform/apps/admin/src/pages/mobile/app/index.tsx` | - |
| `/admin/mobile/app-version` | 管理后台 / 移动端管理 / 版本管理 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/mobile/app-version.json` | - |
| `/admin/mobile/async-task` | 管理后台 / 移动端管理 / 异步任务 | 纯 JSON 契约（只读） | `packages/contracts/src/resources/admin/mobile/async-task.json` | `device-tasks.spec.ts` |
| `/admin/mobile/device` | 管理后台 / 移动端管理 / 设备管理 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/mobile/device.json` + `platform/apps/admin/src/pages/mobile/device/index.tsx` | `device-tasks.spec.ts`, `hodor-device.spec.ts` |
| `/admin/mobile/device-app` | 管理后台 / 移动端管理 / 设备应用 | 纯 JSON 契约（只读） | `packages/contracts/src/resources/admin/mobile/device-app.json` | - |
| `/admin/mqtt/config` | 管理后台 / MQTT / 服务配置 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/mqtt/config.json` | - |
| `/admin/mqtt/console` | 管理后台 / MQTT / 消息控制台 | 自定义业务页 | `platform/apps/admin/src/pages/mqtt/console/index.tsx` | - |
| `/admin/oss/config` | 管理后台 / 对象存储 / 配置管理 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/oss/config.json` | - |
| `/admin/oss/file` | 管理后台 / 对象存储 / 文件中心 | 自定义业务页 | `platform/apps/admin/src/pages/oss/file/index.tsx` | - |
| `/admin/recycle-bin` | 管理后台 / 运维 / 回收站 | 自定义业务页 | `platform/apps/admin/src/pages/recycle-bin/index.tsx` | `delete-undo.spec.ts`, `recycle-bin.spec.ts` |
| `/admin/rpa/config` | 管理后台 / RPA / RPA配置 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/rpa/config.json` | - |
| `/admin/swarm/docker` | 管理后台 / Swarm集群 / Docker服务 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/swarm/docker.json` + `platform/apps/admin/src/pages/swarm/docker/index.tsx` | - |
| `/admin/swarm/docker_config` | 管理后台 / Swarm集群 / Docker配置 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/swarm/docker_config.json` | - |
| `/admin/swarm/nodes` | 管理后台 / Swarm集群 / 节点管理 | 契约只读 + 扩展壳 | `packages/contracts/src/resources/admin/swarm/nodes.json` + `platform/apps/admin/src/pages/swarm/nodes/index.tsx` | - |
| `/admin/system/api-token` | 管理后台 / 系统管理 / API 令牌 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/system/api-token.json` + `platform/apps/admin/src/pages/system/api-token/index.tsx` | `create-reveal.spec.ts` |
| `/admin/system/department` | 管理后台 / 系统管理 / 部门 | 自定义业务页 | `platform/apps/admin/src/pages/system/department/index.tsx` | `api-failure.spec.ts`, `delete-undo.spec.ts`, `recycle-bin.spec.ts` |
| `/admin/system/menu` | 管理后台 / 系统管理 / 菜单 | 自定义业务页 | `platform/apps/admin/src/pages/system/menu/index.tsx` | - |
| `/admin/system/permission` | 管理后台 / 系统管理 / 权限 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/system/permission.json` + `platform/apps/admin/src/pages/system/permission/index.tsx` | - |
| `/admin/system/role` | 管理后台 / 系统管理 / 角色 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/system/role.json` | `api-failure.spec.ts`, `crud-resource-switch.spec.ts`, `role-delete-undo.real.spec.ts`, `role-delete-undo.spec.ts` |
| `/admin/system/role_permission` | 管理后台 / 系统管理 / 角色权限 | 自定义业务页 | `platform/apps/admin/src/pages/system/role_permission/index.tsx` | - |
| `/admin/system/user` | 管理后台 / 系统管理 / 用户 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/admin/system/user.json` + `platform/apps/admin/src/pages/system/user/index.tsx` | - |
| `/admin/voice` | 实时通话根重定向 | 自定义业务页 | `platform/apps/admin/src/pages/voice/index.tsx` | - |
| `/admin/voice/config` | 管理后台 / 实时通话 / 服务配置 | 纯 JSON 契约（零 TSX） | `packages/contracts/src/resources/admin/voice/config.json` | - |
| `/admin/voice/session` | 管理后台 / 实时通话 / 通话会话 | 自定义业务页 | `platform/apps/admin/src/pages/voice/session/index.tsx` | - |
| `/calendar` | 个人日程与提醒 | 自定义业务页 | `platform/apps/admin/src/pages/calendar/index.tsx` | `calendar.spec.ts`, `subscription.spec.ts` |
| `/home` | 主页 | 自定义业务页 | `platform/apps/admin/src/pages/home/index.tsx` | `auth-ui.spec.ts`, `calendar.spec.ts`, `cloudflare-home.spec.ts`, `home-summary.spec.ts`, `usage-trend-math.spec.ts`, `tianditu.spec.ts` |
| `/login` | 登录页 | 自定义业务页 | `platform/apps/admin/src/pages/login/index.tsx` | `auth-ui.spec.ts`, `login-limit.spec.ts` |
| `/me` | 个人资料 | 自定义业务页 | `platform/apps/admin/src/pages/me/index.tsx` | - |
| `/sso/callback` | 身份中心 SSO 回调 | 自定义业务页 | `platform/apps/admin/src/pages/sso-callback/index.tsx` | `auth-ui.spec.ts` |

## 企业协作微前端 (`@hodor/web-enterprise`)（6 个路由）

| 路由 | 菜单 / 功能名 | 实现形态 | 源码 / 契约位置 | E2E 覆盖 |
| --- | --- | --- | --- | --- |
| `/enterprise/asset` | 企业管理 / 资产台账 | 自定义业务页 | `platform/apps/enterprise/src/pages/asset/index.tsx` | `assets.spec.ts` |
| `/enterprise/executive/workflow` | 企业管理 / 事务管理 / 工作流编排 | 自定义业务页 | `platform/apps/enterprise/src/pages/executive/workflow/index.tsx` | - |
| `/enterprise/home` | 企业端独立首页 | 自定义业务页 | `platform/apps/enterprise/src/pages/home/index.tsx` | - |
| `/enterprise/mail/edm` | 企业管理 / 企业邮件 / EDM群发 | 自定义业务页 | `platform/apps/enterprise/src/pages/mail/edm/index.tsx` | - |
| `/enterprise/organization/attendance` | 企业管理 / 组织管理 / 考勤 | 契约扩展页 (`ContractCrudPage`) | `packages/contracts/src/resources/enterprise/organization/attendance.json` + `platform/apps/enterprise/src/pages/organization/attendance/index.tsx` | - |
| `/enterprise/tenant` | 企业管理 / 企业与成员 | 自定义业务页 | `platform/apps/enterprise/src/pages/tenant/index.tsx` | `assets.spec.ts` |

## 个人中心微前端 (`@hodor/web-personal`)（7 个路由）

| 路由 | 菜单 / 功能名 | 实现形态 | 源码 / 契约位置 | E2E 覆盖 |
| --- | --- | --- | --- | --- |
| `/personal/asset` | 个人中心 / 个人资产 | 自定义业务页 | `platform/apps/personal/src/pages/asset/index.tsx` | `personal-assets-model.spec.ts`, `personal-assets.spec.ts` |
| `/personal/base/preference` | 个人中心 / 账号配置 / 邮件偏好 | 自定义业务页 | `platform/apps/personal/src/pages/base/preference/index.tsx` | - |
| `/personal/family` | 个人中心 / 家庭成员 | 自定义业务页 | `platform/apps/personal/src/pages/family/index.tsx` | - |
| `/personal/finance` | 个人中心 / 收入状况 | 自定义业务页 | `platform/apps/personal/src/pages/finance/index.tsx` | - |
| `/personal/health` | 个人中心 / 健康与医疗 | 自定义业务页 | `platform/apps/personal/src/pages/health/index.tsx` | - |
| `/personal/home` | 个人端独立首页 | 自定义业务页 | `platform/apps/personal/src/pages/home/index.tsx` | - |
| `/personal/social` | 个人中心 / 社交圈子 | 自定义业务页 | `platform/apps/personal/src/pages/social/index.tsx` | - |

## 嵌入式子契约 (`mountRoute: false`)

| 资源名 | 宿主页面 | 实现形态 | 契约文件 |
| --- | --- | --- | --- |
| `admin/base/log-audit` | `/admin/base/log` | 只读嵌入 Tab | `packages/contracts/src/resources/admin/base/log-audit.json` |
| `admin/base/log-biz` | `/admin/base/log` | 只读嵌入 Tab | `packages/contracts/src/resources/admin/base/log-biz.json` |
| `admin/base/log-http` | `/admin/base/log` | 只读嵌入 Tab | `packages/contracts/src/resources/admin/base/log-http.json` |
| `admin/base/log-sys` | `/admin/base/log` | 只读嵌入 Tab | `packages/contracts/src/resources/admin/base/log-sys.json` |

## E2E 测试套件索引 (`platform/e2e/`)

| 测试文件 | 运行模式 | 覆盖路由 |
| --- | --- | --- |
| `platform/e2e/api-token/create-reveal.spec.ts` | Mock 隔离 | `/admin/system/api-token` |
| `platform/e2e/auth/auth-ui.spec.ts` | Mock 隔离 | `/admin/ai/chat`, `/home`, `/login`, `/sso/callback` |
| `platform/e2e/calendar/calendar.spec.ts` | Mock 隔离 | `/calendar`, `/home` |
| `platform/e2e/calendar/subscription.spec.ts` | Mock 隔离 | `/calendar` |
| `platform/e2e/cloudflare-home/cloudflare-home.spec.ts` | Mock 隔离 | `/admin/ai/chat`, `/home` |
| `platform/e2e/cloudflare-home/home-summary.spec.ts` | Mock 隔离 | `/home` |
| `platform/e2e/cloudflare-home/usage-trend-math.spec.ts` | 单测 / 实机 | `/home` |
| `platform/e2e/delete-undo/api-failure.spec.ts` | 单测 / 实机 | `/admin/system/department`, `/admin/system/role` |
| `platform/e2e/delete-undo/crud-resource-switch.spec.ts` | Mock 隔离 | `/admin/system/role` |
| `platform/e2e/delete-undo/delete-undo.spec.ts` | Mock 隔离 | `/admin/recycle-bin`, `/admin/system/department` |
| `platform/e2e/delete-undo/role-delete-undo.real.spec.ts` | 单测 / 实机 | `/admin/system/role` |
| `platform/e2e/delete-undo/role-delete-undo.spec.ts` | Mock 隔离 | `/admin/base/sys_config`, `/admin/system/role` |
| `platform/e2e/enterprise-assets/assets.spec.ts` | 单测 / 实机 | `/enterprise/asset`, `/enterprise/tenant` |
| `platform/e2e/mobile-task-runtime/device-tasks.spec.ts` | Mock 隔离 | `/admin/mobile/async-task`, `/admin/mobile/device` |
| `platform/e2e/personal-assets-model.spec.ts` | 单测 / 实机 | `/personal/asset` |
| `platform/e2e/personal-assets.spec.ts` | 单测 / 实机 | `/personal/asset` |
| `platform/e2e/platform-errors/login-limit.spec.ts` | Mock 隔离 | `/login` |
| `platform/e2e/platform-errors/platform-errors.spec.ts` | 单测 / 实机 | 纯逻辑单测 / API 层 |
| `platform/e2e/recycle-bin/recycle-bin.spec.ts` | Mock 隔离 | `/admin/recycle-bin`, `/admin/system/department` |
| `platform/e2e/smoke/hodor-device.spec.ts` | 单测 / 实机 | `/admin/mobile/device` |
| `platform/e2e/tianditu/tianditu.spec.ts` | Mock 隔离 | `/home` |
