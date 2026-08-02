# 中心化 safeFetch、SSRF 黑名单防护与 HTTP 外网请求日志落库 - 实际落地报告

本文档记录本次对话中后端中心化 HTTP 请求工具 `safeFetch` 的实现、SSRF 内网黑名单防护、Cloudflare Workers DNS 兼容以及外网 HTTP 交互日志落库的落地情况。

---

## 1. 复盘次数说明 (Review & Stage Loop)

本次 AI 协作交付过程中，基于 `.agents/` 目录规范与开发者指令反馈，共进行了 **4 次** 深入复盘与重构：
1. **第 1 次复盘（解耦与中心化注册）**：
   - 核心逻辑置于 `@hodor/core/utils/safeFetch.ts`。
   - 满足 `backend.md` 第 5 条解耦规范，在 `register.ts` 中通过 `registry.base.httpFetch` 对外统一暴露 `fetch`、`json`、`text` 三种简易调用接口。
2. **第 2 次复盘（Drizzle 表结构与索引语法修正）**：
   - 根据开发者反馈，将 `base_http_request_log` 索引定义语法从 object 旧语法修正为 Drizzle ORM 标准的 array 数组语法 `(table) => [...]`。
   - 执行 `pnpm run db:generate` 及 `pnpm run db:init node` 成功完成表初始化。
3. **第 3 次复盘（CIDR 位运算重构与 DNS 边缘兼容）**：
   - 废弃复杂的正则匹配，全面改用基于 32 位掩码的纯数学 CIDR 位运算（支持 `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`、`169.254.0.0/16` 等）。
   - 实现 Node.js 原生 DNS 与 Cloudflare DoH (`1.1.1.1`) 双引擎，100% 兼容 Cloudflare Workers 边缘运行环境。
4. **第 4 次复盘（URL 细节拆分扩充）**：
   - 保留原有的 `url` 完整字段，在 `base_http_request_log` 数据表中新增 `protocol`（协议，如 `http`）、`host`（主机与端口，如 `github.com`）、`path`（路径，如 `/api/v1/user`）和 `query`（查询参数，如 `?token=xxx`）字段。

---

## 2. 实际改动文件列表

#### 1. 核心工具库 `@hodor/core`
- **[MODIFY] [safeFetch.ts](https://github.com/OKFred/one-gate/blob/main/server/packages/core/src/utils/safeFetch.ts)**
  - 实现基于 CIDR 位运算的 IP 黑名单与 SSRF 防护。
  - 自动解析拆分 URL（`protocol`、`host`、`path`、`query`）。
  - 支持 Cloudflare Workers DNS / DoH 双引擎解析。
  - 导出 `safeFetch`、`safeFetchJson`、`safeFetchText`。
- **[MODIFY] [safeFetch.spec.ts](https://github.com/OKFred/one-gate/blob/main/server/packages/core/src/utils/safeFetch.spec.ts)**
  - 单元测试（5 项测试全胜），断言验证 URL 细节字段拆分落库与 IPv4/IPv6 私网阻断。

#### 2. 日志模块与数据表 `@hodor/admin`
- **[MODIFY] [model.ts](https://github.com/OKFred/one-gate/blob/main/server/packages/admin/src/base/log/model.ts)**
  - 新增 `baseHttpRequestLogTable` 表定义，包含 `url`、`protocol`、`host`、`path`、`query`、`method`、`requestHeaders`、`requestBody`、`responseStatus`、`responseHeaders`、`responseBody`、`durationMs`、`errorMessage`、`remark`、`createTimeUtc` 等全量字段，使用标准数组索引 `(table) => [...]`。
- **[MODIFY] [repository.ts](https://github.com/OKFred/one-gate/blob/main/server/packages/admin/src/base/log/repository.ts)**
  - 新增 `insertHttpRequestLog` 方法。
- **[MODIFY] [service.ts](https://github.com/OKFred/one-gate/blob/main/server/packages/admin/src/base/log/service.ts)**
  - 在 `baseLogService` 中提供 `http.add` 方法。
- **[MODIFY] [register.ts](https://github.com/OKFred/one-gate/blob/main/server/packages/admin/src/register.ts)**
  - 在 `baseRegister` 中挂载 `httpFetch`。

#### 3. 业务模块重构
- **[MODIFY] [service.ts](https://github.com/OKFred/one-gate/blob/main/server/packages/admin/src/system/auth/service.ts)**
  - 重构 GitHub OAuth (`access_token`, `user`, `user/orgs`) 核心接口请求，全部改用 `registry.base.httpFetch`。

---

## 3. 自动化测试与验证

运行单元测试结果：
```bash
npx vitest run packages/core/src/utils/safeFetch.spec.ts
✓ packages/core/src/utils/safeFetch.spec.ts (5 tests) 11ms
Test Files  1 passed (1)
Tests       5 passed (5)
```
数据库表初始化结果：
```
💾 表 base_http_request_log 已初始化
✅ [Drizzle] base_http_request_log 同步成功
```
