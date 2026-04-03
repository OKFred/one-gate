# RBAC Server

高性能、生产级别的权限管理后台服务，专为 Cloudflare Workers 与 Node.js 混部环境设计。

## 🚀 核心架构与特性

- **双引擎运行时支持**：无缝适配 Cloudflare Workers (D1 数据库) 与 Node.js (LibSQL/SQLite)。
- **指令化 DDL 运维**：通过中心化的 `db:init` 指令管理数据库表结构，彻底剥离运行时建表逻辑，消除冷启动延迟与死锁风险。
- **SQL 最终可信源**：所有表结构定义以 `src/db/sql/*.sql` 文件形式存储，确保 D1 环境与代码库版本严格一致。
- **模块化设计**：包含用户管理、角色权限 (RBAC)、菜单控制、国际化 (i18n)、邮件审计等 14 个核心业务模块。

## 🛠️ 快速开始

### 1. 环境准备

确保您的物理环境中已安装以下工具：

- [Node.js](https://nodejs.org/) (推荐 v18+)
- [pnpm](https://pnpm.io/)
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (用于 D1 同步)

### 2. 数据库初始化 (DDL)

项目不再在启动时自动建表。请根据您的运行目标执行对应的初始化指令：

- **Node/本地文件模式** (请先生成对应的数据库文件，并配置环境变量 DB_FILE_NAME):

  ```bash
  pnpm run db:init node
  ```

- **Cloudflare D1 本地环境**:

  ```bash
  pnpm run db:init worker
  ```

- **Cloudflare D1 远程生产环境**:
  ```bash
  pnpm run db:init worker remote
  ```

### 3. 本地启动

- **Node 模式**:

  ```bash
  pnpm run dev
  ```

- **Worker 本地开发模式**:
  ```bash
  pnpm run worker:dev
  ```

## 🏗️ 项目结构

- `src/api/`: 业务模块，包含 Controller (index.ts), Service, Model (Schema 定义)。
- `src/db/`: 数据库核心逻辑。
  - `sql/`: 存放所有表的 DDL 源码文件。
  - `initTable.ts`: 数据库初始化调度枢纽。
- `src/middleware/`: 包含封装器 (encapsulation) 等核心中间件。

## 📝 运维说明

> [!IMPORTANT] > **Schema 变更流程**：
>
> 1. 在对应的 `model.ts` 中修改 Drizzle Schema。
> 2. 将对应的 SQL 语句同步更新到 `src/db/sql/` 目录。
> 3. 运行 `pnpm run db:init` 进行全量同步。

---

[English Version (README.md)](README.md) | [返回根目录 (../../README_zh_CN.md)](../../README_zh_CN.md)
