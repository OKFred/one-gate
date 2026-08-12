# Schema 依赖缺失防卡死（优化）详细设计

## 1. 背景与现场结论

生产环境“移动端管理 / 设备管理”点击新增后，弹窗持续显示加载动画，保存按钮不可用。现场通过浏览器 DevTools Protocol 验证：

- `admin.data.schema_form.batch_get` 请求已经以 200 完成，并非网络请求挂起；
- 生产 D1 的 `system_schema_form` 未包含 `admin.mobile.device.add.req` 与 `admin.mobile.device.update.req`；
- `useSchema` 已结束加载并返回空 Schema，但 `FormDialog` 仅依据 `resolvedSchema` 是否存在决定显示加载动画，无法区分“加载中”和“加载结束但缺失”；
- GitHub Actions 仅部署 Worker 和 Pages，没有执行 `sync:schemas --remote`，导致后端 API 已发布而系统 Schema 数据未随发布同步。

## 2. 目标

1. 即使生产 D1 未同步系统 Schema，Worker 仍能从随代码发布的运行时 Schema Registry 返回 OpenAPI Schema。
2. 前端明确区分 Schema 加载中、加载失败/缺失和加载成功，不再无限转圈。
3. 对已有自定义表单渲染器的页面，在动态 Schema 缺失时降级为服务端校验模式，保持表单可用。
4. 修正一个页面同时请求 add/update 等不同前缀 Schema 时只请求首个前缀的问题。
5. 将远程系统 Schema 同步纳入 GitHub Actions 部署门禁，使 D1 的管理数据与发布版本一致。

## 3. 方案设计

### 3.1 Worker 运行时 Schema 兜底

扩展核心 `schemaRegistry`，支持按 code 前缀读取当前进程已注册的 Schema。`batch_get` 按以下优先级组装响应：

1. 从运行时 Registry 读取匹配前缀的系统 Schema，作为发布产物内置兜底；
2. 从 D1 读取同前缀 Schema，并覆盖同名 Registry Schema，保持现有数据库热修复能力；
3. 对两种来源统一执行权限过滤和字段清洗。

这样 D1 空数据不会阻断系统表单；D1 中已存在的同名配置仍保持现有优先级。

### 3.2 前端 Schema 状态机

`SchemaCrudPage` 保留 `useSchema.loading` 并传入 `FormDialog`：

- `loading=true`：展示加载动画；
- `loading=false` 且 Schema 存在：正常展示并执行客户端 AJV 校验；
- `loading=false` 且 Schema 不存在，但页面提供 `renderForm`：使用只允许承载表单数据的空对象 Schema，显示警告并降级到服务端接口校验；
- `loading=false` 且 Schema 不存在，也没有自定义渲染器：展示明确错误，不允许提交。

降级只保证已有自定义表单可用，不尝试为完全动态表单猜测字段。

### 3.3 多前缀请求修正

`useSchema` 将 add/update Schema 名按最后一个点分组为多个前缀，分别调用 `batch_get` 后合并结果。请求去重键同时包含前缀集合与缓存版本，避免“带版本请求”和“强制全量请求”错误复用同一个 Promise。

### 3.4 CI 发布门禁

Worker 部署成功后、Pages 构建前，GitHub Actions 执行：

```bash
pnpm run sync:schemas --remote
```

并通过 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` Secrets 完成非交互认证。命令失败会阻断后续 Pages 发布，避免前端先暴露依赖未同步的数据配置。Cloudflare 官方文档要求 CI 使用 API Token/Account ID，并明确远程 D1 导入使用 `wrangler d1 execute --remote --file`。

## 4. 兼容性与安全

- 不修改数据库表结构，不增加迁移。
- 不修改设备增删改接口或请求响应字段。
- D1 Schema 对同名运行时 Schema 保持覆盖优先级，现有热修复语义不变。
- 自定义表单降级时仍由后端 JSON Schema 做最终校验，前端只失去即时校验，不绕过服务端安全边界。
- 不在浏览器或日志中输出认证 Token。

## 5. 验证方案

- 核心 Schema Registry：按前缀命中、隔离和空结果单元测试。
- Worker `batch_get`：D1 缺失时可从 Registry 返回；D1 同名值可覆盖 Registry。
- 前端类型检查和 Admin 构建。
- 浏览器复验设备新增弹窗：无无限 loading、字段可见、保存按钮可用。
- 检查 GitHub Actions YAML 与远程同步命令。
- 执行 Prettier、ESLint、`git diff --check`、LF/UTF-8 和无新增 `any/as any` 检查。

## 6. 后续方向

后续可将系统 Schema 与用户动态 Schema 拆成显式来源端口：系统 Schema 永远来自发布产物，D1 仅保存用户自定义或明确的 override，从模型上消除“生成物是否已同步”的歧义。
