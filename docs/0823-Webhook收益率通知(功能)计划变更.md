# Webhook 收益率通知计划变更

## 后端

1. 新增 Webhook 配置模型、仓储、CRUD 服务、路由和脱敏逻辑。
2. 注册底座 Webhook 通知服务，支持飞书文本消息。
3. 扩展 HTTP Cron 执行器，拆分请求参数和通知参数。
4. 新增 30 年期美债收益率 XML 解析和通知正文格式化。
5. 增加模型、CRUD、通知解析和 Cron 编排测试。

## 数据库与权限

1. 生成 `base_webhook_config` 全量 DDL。
2. 增加 Node 旧库迁移与 Wrangler D1 迁移。
3. 增加 `admin.base.webhook_config` 业务键、权限种子和菜单。
4. 不在任何仓库文件中保存用户提供的 Webhook URL。

## 前端

1. 新增 `/admin/base/webhook_config` 页面。
2. 提供来源、URL、启用、主配置和备注的增删改查。
3. 列表只展示后端脱敏 URL，编辑时通过详情接口加载完整值。
4. 增加中英文文案及 OpenAPI 类型。

## 运行时数据

1. 新增公开的美国财政部 API Task：`us_treasury_30y_yield`。
2. 新增每日 Cron，使用 UTC 01:00（上海 09:00）。
3. Webhook 地址只在目标环境迁移完成后通过管理页或受权 API 写入。

## 验证

1. 改动前后分别执行服务端和管理端构建。
2. 执行相关 Vitest 测试。
3. 运行数据库 DDL 生成、业务键与权限常量生成流程。
4. 执行格式化、Lint、`git diff --check` 和多轮代码审查。
