# RBAC Fullstack

A modern, high-performance Role-Based Access Control (RBAC) system built with Hono (Backend) and React (Frontend). Highlighting seamless deployment on Cloudflare Workers and Node.js.

## 🏗️ Project Architecture

The project is split into two main decoupled modules:

- **[/server](./server)**: The backend service powered by Hono. Supports Cloudflare D1 and local SQLite (LibSQL). Handles authentication, permissions, and business logic.
- **[/platform](./platform)**: The management dashboard built with React 19, MUI v7, and UnoCSS. A sleek, responsive UI for managing users, roles, and permissions.

## 🚀 Quick Start

To get the full system running locally, follow these steps:

### 1. Prerequisites

- **Node.js** (v18+)
- **pnpm** (Package Manager)
- **Cloudflare Wrangler** (for D1/Worker development)

### 2. Setup Backend

```bash
cd server
pnpm install
# Initialize the database (DDL)
pnpm run db:init node
# Start the server
pnpm run dev
```

_For D1 setup, refer to [server/README.md](./server/README.md)._

### 3. Setup Frontend

```bash
cd platform
pnpm install
# Start the dashboard
pnpm run dev
```

_Frontend will be available at `http://localhost:5173`._

## 📂 Key Directories

- `platform/`: React frontend source code.
- `server/`: Hono backend source code.
- `scripts/`: Shared maintenance and scanning scripts.

---

[中文说明 (README_zh_CN.md)](README_zh_CN.md)
