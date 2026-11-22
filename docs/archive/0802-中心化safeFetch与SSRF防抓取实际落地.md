# 中心化 safeFetch、SSRF 黑名单防护与 HTTP 外网请求日志落库 - 实际落地报告

本文档记录后端中心化 HTTP 请求工具 `safeFetch` 的实现、SSRF 内网黑名单防护、Cloudflare Workers DNS 兼容、全量后端网络请求接入以及外网 HTTP 交互日志落库的落地情况。

---

## 1. 核心特性与复盘说明

1. **解耦与中心化注册**：
   - 核心逻辑置于 `@hodor/core/utils/safeFetch.ts`。
   - 满足 `backend.md` 第 5 条解耦规范，在 `register.ts` 中通过 `registry.base.httpFetch` 对外统一暴露 `fetch`、`json`、`text` 三种安全请求接口。
2. **CIDR 位运算与 DNS 边缘兼容**：
   - 基于 32 位掩码纯数学 CIDR 位运算判断私有与保留网段（`127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`、`169.254.0.0/16` 等），防范 SSRF 攻击。
   - 兼容 Cloudflare Workers / DoH 边缘解析。
3. **URL 字段拆分与日志表定义**：
   - 数据表 `base_http_request_log` 包含 `url`、`protocol`、`host`、`path`、`query`、`method`、`requestHeaders`、`requestBody`、`responseStatus`、`responseHeaders`、`responseBody`、`durationMs`、`errorMessage`、`remark`、`createTimeUtc` 等全量字段，采用 Drizzle 数组索引语法 `(table) => [...]`。
4. **全量后端网络请求重构接入**：
   - 后端全部发起的网络请求均已替换重构为 `registry.base.httpFetch`！

---

## 2. 后端全量接入模块清单

| 业务模块 | 所在文件 | 替换接口类型 | 命名空间 (`namespace`) | 说明 |
|---|---|---|---|---|
| **GitHub OAuth 认证** | `system/auth/service.ts` | `registry.base.httpFetch.json` | `system.auth.github` | 换取 AccessToken、拉取用户信息及组织校验 |
| **AI 大模型连通性** | `ai/config/service.ts` | `registry.base.httpFetch.json` | `ai.config.verify` | LLM 模型配置连通性测试 |
| **AI 对话驱动** | `ai/driver.ts` | `registry.base.httpFetch.fetch` | `ai.driver.chat` / `ai.driver.cloudflare` | 驱动 OpenAI / DeepSeek / Cloudflare AI 对话 |
| **Voice 实时通话** | `voice/service.ts` | `registry.base.httpFetch.fetch` | `voice.meeting.create` / `join` / `end` | Cloudflare RealtimeKit 会议创建、加入与销毁 |
| **定时任务执行器** | `maintenance/cron/executor.ts` | `registry.base.httpFetch.fetch` | `cron.executor` | 系统后台 HTTP 定时任务触发 |

---

## 3. 自动化测试与验证

- **后端单元测试**：`packages/core/src/utils/safeFetch.spec.ts` 包含 5 项针对 SSRF 拦截、CIDR 计算与 URL 拆分的自动化测试，**全量 5/5 测试通过**。
- **前端 TypeScript 编译**：`npx tsc --noEmit` **0 报错，类型严格推导验证通过**。
- **前端页面集成**：在管理后台 **日志管理 -> HTTP请求日志** 页面提供多维搜索与下拉筛选查看。
