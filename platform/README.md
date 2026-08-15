# RBAC Dashboard

A high-performance management dashboard for the RBAC system. Built with React 19 and MUI v7 for a sleek and responsive administration experience.

## 🚀 Key Technologies

- **React 19**: Modern UI component library.
- **MUI v7**: Professional-grade design system and components.
- **Vite 7**: Next-generation frontend tooling.
- **Axios**: HTTP client for API communication.
- **React Router 7**: Declarative routing for single-page applications.

## 🛠️ Getting Started

### 1. Prerequisites

- **Node.js** (v18+)
- **pnpm** (Package Manager)

### 2. Configuration

Create a `.env.development` file in the `platform/` directory to configure your backend API endpoint:

```env
VITE_API_URL=http://localhost:3000
```

### 3. Installation & Run

```bash
pnpm install
pnpm run dev
```

Dashboard will be served at `http://localhost:5173`.

## 📦 Core Scripts

- `pnpm run dev`: Start the development server.
- **`pnpm run build`**: Build for production.
- `pnpm run lint`: Lint and fix code issues.
- `pnpm run i18n:scan`: Scan source code for i18n keys.

## Playwright smoke tests

Copy the deployment-neutral template and set your own admin/API origins:

```bash
cp .env.playwright.example .env.playwright.local
pnpm test:e2e:auth
pnpm test:e2e
```

`HODOR_E2E_BASE_URL` is required. `HODOR_E2E_ALLOWED_ORIGINS` and
`HODOR_E2E_DEVICE_CLIENT_ID` are optional. The local environment file and saved
browser authentication state are ignored by Git.

---

[中文说明 (README_zh_CN.md)](README_zh_CN.md)
