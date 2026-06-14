# RBAC Fullstack

[中文说明 (README_zh_CN.md)](README_zh_CN.md)

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

## 🐳 Deployment (Docker)

We provide a cross-platform interactive deployment script:

```bash
# Run the interactive deployment (Build & Push & Compose)
npx tsx deploy.js
```

This script will:

1. Prompt for your **Docker Registry URL**.
2. Automatically build and push `:server` and `:platform` images.
3. Save the URL to your local `.env` for future use.
4. Run `docker compose up -d` to start the services.

## 📂 Key Directories

- `platform/`: React frontend source code.
- `server/`: Hono backend source code.
- `scripts/`: Shared maintenance and scanning scripts.

## ☁️ Cloudflare Deployment & CI/CD (Automation)

### ⚡ Quick Deployment (Backend Only)

You can quickly deploy the backend Workers and provision the associated Cloudflare resources (D1 Database, KV Namespace, R2 Bucket) to your own Cloudflare account by clicking the button below:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/okfred/node_server/tree/dev/server)

> [!IMPORTANT]
> **Post-deployment Steps Required:**
> 1. **Initialize Database Tables:** The button provisions the D1 database but does not initialize the schema. You **must** run the following command locally to sync DDL and base data to your remote D1:
>    ```bash
>    cd server && pnpm run db:init worker remote
>    ```
> 2. **Deploy Frontend Pages:** The deploy button only supports Workers and does *not* deploy the React frontend (`/platform`). You need to manually deploy the `/platform` folder to Cloudflare Pages, and configure the frontend to point to your backend Worker's URL.

### 🛠️ Automated Deployment via GitHub Actions (Recommended)

This repository includes a pre-configured GitHub Actions workflow (`.github/workflows/test.yml`) for automated testing and deployments. If you fork or clone this project and want to deploy it to your own Cloudflare account, follow these steps:

### 1. Rename Project Identifiers

- **Backend Worker**: Open `server/wrangler.jsonc` (or `wrangler.toml`) and change the `"name": "your-worker-name"` to match your desired backend service name on Cloudflare.
- **Frontend Pages**: Open `.github/workflows/test.yml`, go to the very last step, and update `--project-name=your-pages-name` with your Cloudflare Pages project name.

### 2. Configure GitHub Repository Secrets

Navigate to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **Repository secrets**:

- **Cloudflare Credentials**: Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
- **Other Configuration / Test Environment Variables**: Refer to [**`server/.env.example`**](./server/.env.example) to configure any additional secrets needed for testing or development (e.g. `TEST_MAIL_*` variables for email integration testing, which will be safely skipped on CI if not provided).

### 3. Disconnect Automated Builds on Cloudflare

- To avoid double deployments, go to your Cloudflare dashboard settings for the imported Worker and Pages, and **Disconnect** the Git repository under **Build**.
- This delegates the full deployment control to your GitHub Actions runner, establishing a secure delivery pipeline where **"deployments only execute after all tests pass with green lights"**.

