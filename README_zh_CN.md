# RBAC 全栈管理系统

[English Version (README.md)](README.md)

基于 Hono (后端) 与 React (前端) 构建的现代化、高性能权限管理系统。完美支持 Cloudflare Workers (D1 数据库) 与传统的 Node.js 部署。

## 🏗️ 项目架构

本项目由两个高度解耦的子模块组成：

- **[/server](./server)**：后端核心服务。基于 Hono 开发，适配 Cloudflare D1 与本地 SQLite (LibSQL)，负责认证、鉴权及核心业务逻辑。
- **[/platform](./platform)**：管理后台前端。基于 React 19, MUI v7 与 UnoCSS 构建，提供流畅的响应式 UI，用于可视化管理用户、角色、菜单及权限。

## 🚀 快速上手

按照以下步骤在本地运行全栈系统：

### 1. 环境准备

- **Node.js** (推荐 v18+)
- **pnpm** (包管理工具)
- **Cloudflare Wrangler** (用于 D1/Worker 开发)

### 2. 启动后端

```bash
cd server
pnpm install
# 初始化数据库表结构 (DDL)
pnpm run db:init node
# 启动开发服务器
pnpm run dev
```

_更多关于 D1 的配置，请参阅 [后端说明文档](./server/README_zh_CN.md)。_

### 3. 启动前端

```bash
cd platform
pnpm install
# 启动管理后台
pnpm run dev
```

_前端默认运行在 `http://localhost:5173`。_

## 🐳 应用部署 (Docker)

我们提供了一个跨平台的交互式部署脚本：

```bash
# 启动交互式部署 (Build & Push & Compose)
npx tsx deploy.js
```

该脚本会自动执行以下步骤：

1. 提示输入你的 **Docker Registry 项目地址**。
2. 自动构建并推送 `:server` 和 `:platform` 镜像。
3. 将输入的地址保存到根目录的 `.env` 中，方便下次使用。
4. 运行 `docker compose up -d` 启动服务。

## 📂 核心目录

- `platform/`: 前端 React 源代码。
- `server/`: 后端 Hono 源代码。
- `scripts/`: 共享的一键扫描与维护脚本。

## ☁️ Cloudflare 部署与 CI/CD (自动化集成)

### ⚡ 极速部署 (仅限后端)

你可以通过点击下方的按钮，将后端 Workers 及其关联的 Cloudflare 资源（D1 数据库、KV 命名空间、R2 存储桶）一键部署到你自己的 Cloudflare 账号中：

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/okfred/node_server/tree/dev/server)

> [!IMPORTANT]
> **部署完成后的后续步骤：**
> 1. **初始化数据库表结构：** 部署按钮仅会在你的账户中自动创建 D1 数据库，但不会初始化表结构。你**必须**在本地运行以下命令，将 DDL 和基础权限数据同步到你的远程 D1 数据库中：
>    ```bash
>    cd server && pnpm run db:init worker remote
>    ```
> 2. **部署前端 Pages：** 该部署按钮仅支持 Workers 部署，**不会**部署 React 前端项目 (`/platform`)。你需要手动将 `/platform` 文件夹发布到 Cloudflare Pages，并配置前端使其指向你的后端 Worker 的 URL。

### 🛠️ 通过 GitHub Actions 自动部署 (推荐)

本项目已集成极简、安全的 GitHub Actions 持续集成与部署工作流（通过 `.github/workflows/test.yml` 驱动）。对于 fork 或 clone 本项目的用户，如果想要自动构建并部署全栈系统，请参照以下指引：

### 1. 修改项目标识名称

- **后端 Worker**：打开 `server/wrangler.jsonc`（或 `wrangler.toml`），修改里面的 `"name": "your-worker-name"` 为你的后端服务名。
- **前端 Pages**：打开 `.github/workflows/test.yml`，定位到文件最末尾的 `--project-name=your-pages-name`，将其修改为你在 Cloudflare 上创建的前端 Pages 项目名。

### 2. 配置 GitHub Repository Secrets

进入你的 GitHub 仓库 -> **Settings** -> **Secrets and variables** -> **Actions** -> **Repository secrets**：

- **Cloudflare 部署凭证**：配置 `CLOUDFLARE_ACCOUNT_ID` 与 `CLOUDFLARE_API_TOKEN`。
- **其他配置与测试变量**：参考 [**`server/.env.example`**](./server/.env.example) 文件，根据需要录入其他关联机密（如发信集成测试所需的 `TEST_MAIL_*` 系列环境变量，若不录入则在 CI 上自动且安全地跳过相关测试）。

### 3. 断开 Cloudflare 控制台的自动构建

- 强烈建议在 Cloudflare 网页端进入该项目的 Workers 和 Pages 详情设置，在 **Build** 下将 Git 仓库的自动构建 **Disconnect（断开连接）**。
- 这样部署权将彻底交由 GitHub Actions 接管，真正实现 **“只有在自动化测试全数绿灯通过后，才准入并执行部署”** 的高质量发布防线。

