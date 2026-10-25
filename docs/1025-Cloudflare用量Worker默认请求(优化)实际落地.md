# Cloudflare 用量 Worker 默认请求修复

基线：`main / 835aefffa883b297292a3e3402cbba5b2a248642`。分支：`codex/cloudflare-usage-worker-fetch`。

## 原因与修改

独立 Workerd 使用生产相同的 `2026-03-17`、`nodejs_compat` 复现了两个调用阻断：

1. 将原生 `fetch` 存为实例属性后，通过 `this.fetcher(...)` 调用会带入错误 receiver，抛出 `Illegal invocation`；现有稳定错误处理将其转成 `network_error`。默认值改为箭头委托 `globalThis.fetch(input, init)`，注入的 Fetcher 调用行为不变。
2. 修正 receiver 后，Workerd 继续拒绝 `redirect: "error"`，在发出请求前抛出 `TypeError`。改为 `manual`，显式拒绝所有 3xx，返回稳定原因 `redirect_rejected`；不跟随 `Location`。

同一原生 redirect 限制也影响 AI chat 的配置模型与 Cloudflare REST 通道：`provider.ts` 向共享 HTTP 层传入的 `redirect: "error"` 同步改为 `manual`，继续通过 `!result.ok` 拒绝 3xx。只请求选定端点一次，不切换模型或供应商。

生产代码仅修改 `client.ts` 和 AI chat `provider.ts`。旧 adapter 测试同步 redirect 断言，另加独立原生 Workerd 回归及两类 AI REST provider 的 302 回归；无依赖、环境、数据库或调度修改。

## 复现与验证边界

已安装的 Vitest Workers 池会预先将全局 `fetch` 包装为箭头函数，因此原测试无法检出 receiver 问题。原 adapter 与调度测试另行注入了 Fetcher，没有触发原生 Request 对 `redirect: "error"` 的校验。新增 Node spec 用已安装 Miniflare 单独启动原生 Workerd，打包实际 `client.ts`，不加载该测试池 shim。

- 修复前，实际默认 client 的原生运行时测试返回 `network_error`；同运行时的错误 receiver 负例直接返回 `Illegal invocation`。
- 原生回归覆盖默认 Billing GET、GraphQL POST、注入 Fetcher 行为和拒绝外域 302。所有凭据均为 synthetic；`fetchMock.disableNetConnect()`、`cf: false` 和本地 outbound service 隔离外网。302 测试确认仅一次官方域名请求，未访问重定向目标。
- 302 测试直接使用 outbound service，避免 Miniflare 的 Node mock 桥先跟随重定向、掩盖原生 `manual` 行为。
- 本次完成两轮复核；Node 定向 18 项通过（含独立原生 Workerd 4 项，另 3 项 PG 测试未启用），Worker/D1 定向 14 项通过；应用 TypeScript、格式、ESLint、差异检查均通过。
- AI Node 47 项、Worker 37 项通过，覆盖 OpenAI 兼容与 Cloudflare REST 的 302 拒绝、单次调用及模型/供应商快照保持；使用受控 provider，不代表这些 REST 配置已经完成真实在线验收。

## 官方依据与后续验收

- [Workers Request redirect 模式](https://developers.cloudflare.com/workers/runtime-apis/request/)：仅支持 `follow` 和 `manual`，`error` 会直接抛错；跨域跟随可能转发请求头。
- [Workers Illegal invocation](https://developers.cloudflare.com/workers/observability/errors/#illegal-invocation-errors)。
- [Miniflare 出站请求 mock](https://developers.cloudflare.com/workers/testing/miniflare/core/standards/)。

新增但未修复的 TypeScript 报错：无。此文仅记录本地真实运行时与模拟网络验证；生产修复后的来源请求、持久任务续跑及页面验收，由部署流程单独确认。
