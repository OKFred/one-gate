# RBAC Server

A high-performance, production-ready permission management backend service designed for Cloudflare Workers and Node.js hybrid deployments.

## 🚀 Core Features

- **Dual-Engine Runtime Support**: Seamlessly adapts to Cloudflare Workers (D1 Database) and Node.js (LibSQL/SQLite).
- **Command-Driven DDL Maintenance**: Manage database table structures via the centralized `db:init` command. Decoupled DDL from runtime for faster startup and zero deadlock risk.
- **SQL Source of Truth**: All table structure definitions are stored in `src/db/sql/*.sql` files, ensuring strict consistency between D1 environments and the codebase.
- **Modular RBAC**: Includes 14 core modules: User management, Role-based access control (RBAC), Menu management, i18n support, and Mail auditing.

## 🛠️ Quick Start

### 1. Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Recommended v18+)
- [pnpm](https://pnpm.io/)
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (Required for D1 synchronization)

### 2. Database Initialization (DDL)

Table structures are no longer automatically created at startup. Execute the appropriate command based on your target environment:

- **Node/Local File Mode** (Please create a db file, and set up the environment variable called DB_FILE_NAME):

  ```bash
  pnpm run db:init node
  ```

- **Cloudflare D1 Local Environment**:

  ```bash
  pnpm run db:init worker
  ```

- **Cloudflare D1 Remote Production Environment**:
  ```bash
  pnpm run db:init worker remote
  ```

### 3. Local Development

- **Node.js Mode**:

  ```bash
  pnpm run dev
  ```

- **Worker Local Mode**:
  ```bash
  pnpm run worker:dev
  ```

## 🏗️ Project Structure

- `src/api/`: Business modules (Controllers, Services, Models).
- `src/db/`: Database core.
  - `sql/`: DDL source files for all tables.
  - `initTable.ts`: Central database initialization orchestrator.
- `src/middleware/`: Core middlewares (including the `encapsulation` wrapper).

## 📝 Maintenance Notes

> [!IMPORTANT] > **Schema Change Workflow**:
>
> 1. Modify the Drizzle Schema in the corresponding `model.ts`.
> 2. Synchronize the SQL statements to the `src/db/sql/` directory.
> 3. Run `pnpm run db:init` to apply changes.

---

[中文说明 (README_zh_CN.md)](README_zh_CN.md) | [Go to Root (../../README.md)](../../README.md)
