# OKFred 架构演进待办：方案 C — Monorepo + 按需构建

本文件记录了从当前**方案 B（逻辑分域单体）**演进到**方案 C（Monorepo + 按需构建）**的实施步骤。

> **前置条件**：方案 B 已完成（路由已按 `infra/` 和 `biz/` 分层，ServiceLocator 已引入）。

---

## 🎯 方案 C 的目标

- 将共享底座（middleware、utils、db、types）抽成独立 package
- 支持按模块独立构建和部署（例如只部署 infra Worker 或只部署 biz Worker）
- 保持单一仓库，通过 pnpm workspace 管理依赖

---

## 📋 实施步骤

### 阶段 1：Monorepo 包结构搭建

- [ ] **1.1 规划 packages 目录结构**
  ```
  node_server/
  ├── packages/
  │   ├── core/              ← 共享底座
  │   │   ├── middleware/     ← 从 server/src/middleware/ 迁移
  │   │   ├── utils/          ← 从 server/src/utils/ 迁移
  │   │   ├── db/             ← 从 server/src/db/ 迁移
  │   │   ├── types/          ← 从 server/src/types/ 迁移
  │   │   ├── jobs/           ← 从 server/src/jobs/ 迁移
  │   │   ├── constants/      ← 从 server/src/constants/ 迁移
  │   │   └── package.json    ← name: "@hodor/core"
  │   ├── infra/              ← 基础设施模块
  │   │   ├── system/
  │   │   ├── i18n/
  │   │   ├── mail/
  │   │   ├── oss/
  │   │   ├── maintenance/
  │   │   └── package.json    ← name: "@hodor/infra"，依赖 @hodor/core
  │   └── biz/                ← 业务模块
  │       ├── enterprise/
  │       ├── ai/
  │       ├── swarm/
  │       └── package.json    ← name: "@hodor/biz"，依赖 @hodor/core, @hodor/infra
  ├── apps/
  │   ├── server/             ← 全量应用入口（Node.js + Worker）
  │   │   ├── src/index.ts    ← 聚合 @hodor/infra + @hodor/biz
  │   │   ├── src/worker.ts
  │   │   ├── src/node.ts
  │   │   ├── wrangler.jsonc
  │   │   └── package.json    ← 依赖 @hodor/core, @hodor/infra, @hodor/biz
  │   └── worker-infra/       ← 可选：只部署基础设施的独立 Worker
  │       ├── src/worker.ts
  │       ├── wrangler.jsonc  ← 独立的 Worker 名称和绑定
  │       └── package.json    ← 只依赖 @hodor/core, @hodor/infra
  └── platform/               ← 前端（不动）
  ```

- [ ] **1.2 更新根目录 `pnpm-workspace.yaml`**
  ```yaml
  packages:
    - 'packages/*'
    - 'apps/*'
    - 'platform'
  ```

- [ ] **1.3 为每个 package 创建 `package.json` 和 `tsconfig.json`**
  - `@hodor/core`：零外部依赖，导出 middleware、utils、db、types
  - `@hodor/infra`：依赖 `@hodor/core`
  - `@hodor/biz`：依赖 `@hodor/core`、`@hodor/infra`（如需跨层调用）

---

### 阶段 2：共享底座抽离

- [ ] **2.1 迁移 middleware/**
  - 将 `server/src/middleware/` 移动到 `packages/core/middleware/`
  - 更新所有 `@/middleware/xxx` 的 import 为 `@hodor/core/middleware/xxx`
  - 保持导出接口不变

- [ ] **2.2 迁移 utils/**
  - 将 `server/src/utils/` 移动到 `packages/core/utils/`
  - 特别注意 `env.ts`、`storage/` 等运行时相关的工具需要保持双运行时兼容

- [ ] **2.3 迁移 db/**
  - 将 `server/src/db/` 移动到 `packages/core/db/`
  - 包括 SQL、init 脚本、Drizzle schema 等
  - `initTable.ts` 等初始化脚本需要能独立运行

- [ ] **2.4 迁移 types/**
  - 将 `server/src/types/` 移动到 `packages/core/types/`
  - 确保 `AppBindings`、`Context`、`ResJson` 等核心类型被正确导出

- [ ] **2.5 迁移 jobs/**
  - 将 `server/src/jobs/` 移动到 `packages/core/jobs/`
  - scheduler 和 executor 保持运行时无关

---

### 阶段 3：业务模块包化

- [ ] **3.1 迁移 infra 模块**
  - `server/src/api/infra/system/` → `packages/infra/system/`
  - `server/src/api/infra/i18n/` → `packages/infra/i18n/`
  - `server/src/api/infra/mail/` → `packages/infra/mail/`
  - `server/src/api/infra/oss/` → `packages/infra/oss/`
  - `server/src/api/infra/maintenance/` → `packages/infra/maintenance/`
  - 每个包导出一个 `createApp()` 函数

- [ ] **3.2 迁移 biz 模块**
  - `server/src/api/biz/enterprise/` → `packages/biz/enterprise/`
  - `server/src/api/biz/ai/` → `packages/biz/ai/`
  - `server/src/api/biz/swarm/` → `packages/biz/swarm/`

- [ ] **3.3 更新 apps/server 入口**
  ```typescript
  // apps/server/src/index.ts
  import { createInfraApp } from "@hodor/infra";
  import { createBizApp } from "@hodor/biz";
  
  function createApp() {
    const app = new OpenAPIHono<AppBindings>();
    app.route("/infra", createInfraApp());
    app.route("/biz", createBizApp());
    return app;
  }
  ```

---

### 阶段 4：构建编排（可选）

- [ ] **4.1 引入 Turborepo 或 Nx**
  - `npx -y create-turbo@latest`
  - 配置 `turbo.json` 定义 build/test/lint 任务依赖图
  - 利用缓存加速增量构建

- [ ] **4.2 配置按需构建**
  - `apps/server`：全量构建，包含所有模块
  - `apps/worker-infra`：只构建 infra 相关代码
  - 通过 wrangler 的 `main` 字段指向不同入口

- [ ] **4.3 配置独立部署**
  - 为每个可独立部署的 Worker 配置独立的 `wrangler.jsonc`
  - 共享同一个 D1 数据库，但可以有不同的 KV/R2 绑定
  - 通过 Service Bindings 实现 Worker 间通信（如 biz Worker 调用 infra Worker）

---

### 阶段 5：前端拆分 — ABAC 管理核心 vs 业务消费应用

> **核心思路**：将前端拆为 3 个独立应用 + 1 个共享包，各应用独立构建部署，但共享底层组件和工具库。

- [ ] **5.1 规划前端应用拆分结构**
  ```
  node_server/
  ├── packages/
  │   └── ui/                          ← 共享前端底座包
  │       ├── components/              ← 从 platform/src/components/ 迁移
  │       │   ├── Crud/                  (SchemaCrudPage, PageLayout 等)
  │       │   ├── Form/
  │       │   ├── Responsive/
  │       │   ├── FileManager/
  │       │   ├── Markdown/
  │       │   ├── Notification/
  │       │   ├── Icon/
  │       │   ├── ProtectedRoute.tsx
  │       │   └── ChunkErrorBoundary.tsx
  │       ├── hooks/                   ← 从 platform/src/hooks/ 迁移
  │       │   ├── usePermission.ts
  │       │   ├── useResponsive.ts
  │       │   ├── useTranslation.ts
  │       │   ├── useMenu.ts
  │       │   ├── useUserInfo.ts
  │       │   └── useThemeMode.ts
  │       ├── contexts/                ← 从 platform/src/contexts/ 迁移
  │       │   ├── MenuContext.tsx
  │       │   └── PermissionContext.tsx
  │       ├── layout/                  ← 从 platform/src/layout/ 迁移
  │       ├── utils/                   ← 从 platform/src/utils/ 迁移
  │       ├── theme.tsx                ← 从 platform/src/theme.tsx 迁移
  │       ├── api/config.ts            ← 统一的 API 配置（baseURL 等）
  │       └── package.json             ← name: "@hodor/ui"
  │
  ├── apps/
  │   ├── admin/                       ← 🔧 ABAC 管理后台（系统管理员使用）
  │   │   ├── src/
  │   │   │   ├── pages/
  │   │   │   │   ├── system/            (user, role, menu, permission, department)
  │   │   │   │   ├── i18n/              (language)
  │   │   │   │   ├── mail/              (account, template, log, action)
  │   │   │   │   ├── maintenance/       (cache, cron, audit_login, compliance)
  │   │   │   │   ├── oss/               (object storage)
  │   │   │   │   └── home/              (管理后台首页/仪表盘)
  │   │   │   ├── api/                   (对应 /api/v1/infra/* 的调用)
  │   │   │   ├── routes.tsx
  │   │   │   ├── App.tsx
  │   │   │   └── main.tsx
  │   │   ├── index.html
  │   │   └── package.json             ← 依赖 @hodor/ui
  │   │
  │   ├── enterprise/                  ← 🏢 企业业务消费端
  │   │   ├── src/
  │   │   │   ├── pages/
  │   │   │   │   ├── attendance/        (考勤管理)
  │   │   │   │   ├── workflow/          (工作流)
  │   │   │   │   ├── marketing/         (营销，未来含 mail)
  │   │   │   │   ├── ai/               (AI 对话)
  │   │   │   │   ├── swarm/            (容器编排)
  │   │   │   │   └── home/             (企业端首页)
  │   │   │   ├── api/                   (对应 /api/v1/biz/* 的调用)
  │   │   │   ├── routes.tsx
  │   │   │   ├── App.tsx
  │   │   │   └── main.tsx
  │   │   ├── index.html
  │   │   └── package.json             ← 依赖 @hodor/ui
  │   │
  │   └── personal/                    ← 👤 个人消费端（未来）
  │       ├── src/
  │       │   ├── pages/
  │       │   │   ├── health/            (健康管理)
  │       │   │   ├── income/            (收入管理)
  │       │   │   ├── social/            (社交)
  │       │   │   ├── me/               (个人设置，从现有 me 页面迁移)
  │       │   │   └── home/             (个人端首页)
  │       │   ├── api/                   (对应 /api/v1/personal/* 的调用)
  │       │   ├── routes.tsx
  │       │   ├── App.tsx
  │       │   └── main.tsx
  │       ├── index.html
  │       └── package.json             ← 依赖 @hodor/ui
  ```

- [ ] **5.2 抽离共享底座包 `@hodor/ui`**
  - 将现有 `platform/src/components/` 全部迁入 `packages/ui/components/`
  - 将 `hooks/`、`contexts/`、`layout/`、`utils/`、`theme.tsx` 迁入 `packages/ui/`
  - 配置 `package.json` 的 `exports` 字段，按子路径导出：
    ```json
    {
      "name": "@hodor/ui",
      "exports": {
        "./components/*": "./components/*",
        "./hooks/*": "./hooks/*",
        "./contexts/*": "./contexts/*",
        "./layout": "./layout/index.tsx",
        "./theme": "./theme.tsx"
      }
    }
    ```

- [ ] **5.3 创建 admin 应用（ABAC 管理核心）**
  - 从 `platform/` 中拆出 system、i18n、mail、maintenance、oss 页面
  - 路由保持 `import.meta.glob('./pages/**/index.tsx')` 自动发现模式
  - 登录页、错误页、首页各应用独立维护
  - 部署到 `/admin` 子路径或独立子域名（如 `admin.yourdomain.com`）

- [ ] **5.4 创建 enterprise 应用（企业业务消费端）**
  - 从 `platform/` 中拆出 enterprise、ai、swarm 页面
  - 可能需要精简侧边栏菜单，只显示业务相关菜单
  - 部署到 `/app` 子路径或独立子域名

- [ ] **5.5 创建 personal 应用（个人消费端，未来）**
  - 新建应用，按需添加 health、income、social 等页面
  - 从现有 `me/` 页面迁移个人设置功能
  - 部署到 `/me` 子路径或独立子域名

- [ ] **5.6 统一登录与鉴权**
  - 三个前端应用共享同一套后端 auth 接口（`/api/v1/infra/system/auth`）
  - 共享同一个 JWT/Session，跨应用免重复登录
  - `@hodor/ui` 提供统一的 `ProtectedRoute`、`PermissionContext`
  - 各应用按需加载自己的权限码子集（admin 全量权限，enterprise/personal 只加载业务权限）

- [ ] **5.7 统一菜单与权限配置**
  - 后端 `initMenu.ts` 中按 `app_scope` 字段区分菜单归属（admin/enterprise/personal）
  - 前端通过 `useMenu()` 按应用过滤菜单
  - `usePermission.ts` 移入 `@hodor/ui`，权限码常量按应用拆分导出：
    ```typescript
    // @hodor/ui/hooks/usePermission.ts
    export const ADMIN_PERMISSIONS = { SYSTEM: {...}, MAINTENANCE: {...} };
    export const ENTERPRISE_PERMISSIONS = { ATTENDANCE: {...}, WORKFLOW: {...} };
    export const PERSONAL_PERMISSIONS = { HEALTH: {...}, INCOME: {...} };
    ```

- [ ] **5.8 API baseURL 多端适配**
  - 如果后端仍是单 Worker 部署，所有前端应用指向同一个 API baseURL
  - 如果后端已拆分为多 Worker（方案 C 后端），前端按域路由：
    ```typescript
    // @hodor/ui/api/config.ts
    export const API_BASE = {
      infra: import.meta.env.VITE_API_INFRA_URL || '/api/v1/infra',
      biz: import.meta.env.VITE_API_BIZ_URL || '/api/v1/biz',
      personal: import.meta.env.VITE_API_PERSONAL_URL || '/api/v1/personal',
    };
    ```

- [ ] **5.9 构建与部署配置**
  - 每个 app 有独立的 `vite.config.ts`，共享 `@hodor/ui` 依赖
  - 可通过 Turborepo 或 pnpm workspace 统一构建：
    ```bash
    pnpm --filter @hodor/admin build    # 只构建管理后台
    pnpm --filter @hodor/enterprise build  # 只构建企业端
    pnpm -r build                        # 全量构建
    ```
  - 部署方案选择：
    - **Cloudflare Pages**：每个 app 一个 Pages 项目（推荐，免费额度充裕）
    - **单域名子路径**：通过 nginx 或 CF Workers 的 `routes` 按路径分发
    - **子域名**：`admin.xxx.com`、`app.xxx.com`、`me.xxx.com`

---

## ⚠️ 注意事项

1. **什么时候触发方案 C**：
   - 模块数超过 15-20 个
   - 有多个开发者需要独立负责不同模块
   - Worker 脚本大小接近 10MB 限制
   - 需要不同模块有不同的发布节奏
   - 前端打包体积过大，需要按应用独立构建

2. **方案 B 的产出在 C 中完全保留**：
   - 路由分层（`infra/` `biz/`）→ 直接对应 packages 目录
   - ServiceLocator → 移入 `@hodor/core` 包
   - EventBus → 移入 `@hodor/core` 包

3. **翻译文件 (translation.ts) 的处理**：
   - 后端：每个模块的 `translation.ts` 跟随模块迁移，`@hodor/core` 提供翻译注册/合并机制
   - 前端：`@hodor/ui` 提供 `useTranslation`、`useLoadTranslations` hooks，各应用按需加载翻译资源

4. **测试配置**：
   - 后端：`vitest.config.node.mts` 和 `vitest.config.workers.mts` 移到 `apps/server/`
   - 前端：各 app 有独立的 vitest 配置，`@hodor/ui` 有自己的组件单元测试
   - 集成测试仍在 app 层面运行

5. **前端拆分优先级建议**：
   - **Phase 1**：先抽 `@hodor/ui` 共享包（改动最小，收益最大）
   - **Phase 2**：拆出 admin 应用（ABAC 核心，页面最稳定）
   - **Phase 3**：拆出 enterprise 应用（业务功能，变化最频繁）
   - **Phase 4**：按需创建 personal 应用（完全是新功能开发）
