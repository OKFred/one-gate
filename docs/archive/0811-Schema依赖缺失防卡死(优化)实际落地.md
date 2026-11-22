# Schema 依赖缺失防卡死（优化）实际落地

## 1. 结论

生产“设备管理 / 新增”无限加载已恢复：只补入缺失的设备 add/update 系统 Schema 后，刷新页面并重新点击新增，表单字段正常出现、加载动画消失、保存按钮可用，未创建任何设备记录。

代码侧已完成三层防线：Worker 运行时 Registry 兜底、前端显式缺失/降级状态、GitHub Actions 自动同步远程 D1。

## 2. 实际改动

### 2.1 Worker 与领域服务

- `schemaRegistry` 新增按 code 前缀读取已注册 Schema 的能力，并返回 Map 副本。
- `schema_form/batch_get` 合并运行时 Registry 与 D1：
  - D1 完全缺失时直接返回随 Worker 发布的系统 Schema；
  - 合法的 D1 同名 JSON 保持热修复覆盖优先级；
  - 损坏的 D1 同名 JSON 不再覆盖 Registry 内的有效 Schema；
  - 用户自定义且只存在于 D1 的非 JSON 数据保持原有下游行为。
- 将 Schema 清洗与来源合并拆为纯函数，并补充单元测试。
- 清理触及的 `schema_form/service.ts` 中两个未使用导入和原有 `any` 清洗函数。

### 2.2 前端共享组件

- `useSchema` 按 add/update 等不同前缀分别请求并合并，不再只请求第一个 Schema 的前缀。
- 请求去重键加入缓存版本，避免增量请求与强制全量请求错误共用 Promise。
- object Schema 模式不再用空 code 请求后端。
- `FormDialog` 现在区分：
  - 加载中：显示进度；
  - 完全动态表单缺失：显示错误并禁止保存；
  - 自定义渲染表单缺失：显示警告，降级到服务端保存校验；
  - 正常：继续使用动态 Schema 和 AJV 客户端校验。
- 新增/编辑分别判断降级状态，编辑错误上下文绑定当前实际 Schema。
- 增加中英文通用提示，不依赖生产翻译表才能显示。

### 2.3 发布流程

- Worker 部署成功后新增 `Sync System Schemas to Remote D1` 步骤。
- CI 使用既有 Cloudflare API Token 与 Account ID Secrets 执行 `pnpm run sync:schemas --remote`。
- 同步失败会阻断后续 Pages 发布。
- 同步脚本成功日志由硬编码 `364` 改为实际 `schemaCount`。

### 2.4 生产热修复

通过当前浏览器管理端登录态新增以下系统记录：

- `admin.mobile.device.add.req`，生产记录 ID 741；
- `admin.mobile.device.update.req`，生产记录 ID 742。

两条记录均来自当前后端生成的 `schemas.sql`。热修复仅修改 `system_schema_form`，没有新增、修改或删除移动设备业务数据。

## 3. 与计划差异

- 计划外增加了“损坏 D1 JSON 不覆盖有效 Registry Schema”的保护，这是第一轮复盘发现的可靠性边界。
- 计划外修正了编辑弹窗错误上下文和新增/编辑降级判定，这是第二轮复盘发现的通用组件边界。
- 没有新增数据库迁移、OpenAPI 变更或设备接口变更，与计划一致。
- 没有修改 `one-autojs6`，与计划一致。

## 4. 验证结果

### 4.1 生产浏览器

- 修复前：新增弹窗存在 1 个持续进度条，保存按钮禁用；`batch_get` 已完成但返回空 `schemaKeys`。
- 热修复后：新增弹窗进度条为 0；`clientId/deviceName/isEnabled/remark` 字段可见；保存按钮可用。
- 未提交表单，未创建设备。

### 4.2 自动检查

- 修改前 Server `tsc --noEmit`：通过。
- 修改后 Server `tsc --noEmit`：通过。
- 修改前 Admin `tsc -b`：通过。
- 修改后 Admin `tsc -b`：通过。
- Server/Platform 变更文件 Prettier：通过。
- Server/Platform 变更文件 ESLint：0 error、0 warning。
- Node 原生 TypeScript 断言：Registry 前缀、无 D1 兜底、合法 D1 覆盖、损坏 D1 保护共 4 项通过。
- GitHub Actions YAML 解析及远程 Schema 同步步骤断言：通过。
- `git diff --check`：通过。
- 无新增 `any/as any`：通过。

### 4.3 当前 WSL 环境限制

- Vitest 无法启动：共享 `node_modules` 安装的是 Windows 原生依赖，WSL 缺少 `@rollup/rollup-linux-x64-gnu`；不是测试断言失败。对应纯函数断言已使用 Node 原生 TypeScript 补跑，正式 GitHub Actions 会在全新 Linux 环境运行 Vitest。
- Server `tsgo` 完整构建无法启动：缺少 `@typescript/native-preview-linux-x64`；标准 TypeScript 诊断已通过。
- Admin Vite 构建在当前 WSL 共享依赖下长时间停留于 Module Federation 解析并持续占用 CPU，手动中止；其 `tsc -b` 已通过。生产 GitHub Actions 采用全新 Linux 安装，应以该流水线构建结果作为最终发布门禁。

## 5. 复盘轮次

- 第 1 轮：修正损坏 D1 JSON 覆盖有效 Registry Schema、编辑错误上下文。
- 第 2 轮：拆分新增/编辑 Schema 降级判定，避免对象型 update Schema 被误报为降级。
- 最终审计：未发现新的阻断问题。

## 6. 后续建议

1. 本次代码合并后重新执行 GitHub Actions；确认新增 `Sync System Schemas to Remote D1` 步骤成功，再验收生产 `batch_get`。
2. 为部署增加 Schema 数量或关键 code 查询校验，使“命令成功但关键数据缺失”也能阻断发布。
3. 中期将系统 Schema 与用户动态 Schema 分源：系统 Schema 以发布产物为准，D1 只保存用户 Schema 或显式 override。
4. 修复现有 React Router 父路由缺少 `*` 的控制台警告；该问题与本次新增弹窗卡住无直接关系。
