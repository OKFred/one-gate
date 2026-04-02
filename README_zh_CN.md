# RBAC 全栈管理系统

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

## 📂 核心目录

- `platform/`: 前端 React 源代码。
- `server/`: 后端 Hono 源代码。
- `scripts/`: 共享的一键扫描与维护脚本。

---

[English Version (README.md)](README.md)
