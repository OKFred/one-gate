# Cloudflare 用量首页与 AI 对话统一：计划变更

## 第一阶段

- AI chat model/service：增加同权限 models 能力清单与可选 modelKey。
- 独立受控 descriptor / provider adapter：真实选模、修订校验、一次调用、图片验证和脱敏错误；修正主配置查询。
- 合并 admin home 和 ai/chat：单一聊天实现、Markdown/附件/重试/展开/快捷问题，首页先欢迎和权限入口。
- 更新前端 API、双语文案、认证 fixture、AI Node/Worker 与浏览器回归。

## 第二阶段

- 新增 admin maintenance/cloudflare-usage：类型/schema、只读官方 API、计量/费用规范化、额度规则、采集 job 和 repository。
- 新增 SQLite/D1/PG 快照、逐日数据和同步状态及定向DDL/增量迁移；同步新库结构契约。
- 接入 Worker/Node/PG maintenance 调度、业务注册/权限/翻译、PG路由能力、OpenAPI及权限生成产物。
- 首页 MUI 额度卡片、费用分组、明细/7与30天趋势、覆盖/更新/缺配置状态及刷新权限。无需大型图表依赖。
- 部署示例仅写 Secret 名称，不写值；提供账号 Token 权限与真实只读验收说明。

## 验证及交付

- 修改前后记录 server 与 admin TypeScript 诊断；格式化和 ESLint 仅处理变更文件。
- 定向 Node/Worker/PG 测试、迁移演练、受控浏览器 fixture；执行相关构建与 git diff --check。
- 复盘最多5轮，记录实际次数及计划差异。
- 补实际落地文档，区分代码/fixture、数据库演练、真实账号和上线结果；当前不授权本轮推送、合并或发布。
