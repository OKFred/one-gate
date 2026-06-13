# RBAC Server

A high-performance, production-ready permission management backend service designed for Cloudflare Workers and Node.js hybrid deployments.

[中文说明 (README_zh_CN.md)](README_zh_CN.md)

## 🛠️ Quick Start

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Recommended v18+)
- [pnpm](https://pnpm.io/)
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (Required for D1 synchronization)

### Database Initialization (DDL)

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

### Local Development

- **Node.js Mode**:

  ```bash
  pnpm run dev
  ```

- **Worker Local Mode**:
  ```bash
  pnpm run worker:dev
  ```

## 📊 Dependency Graph

<!-- DEPENDENCY_GRAPH_START -->

```mermaid
---
config:
  theme: neo-dark
  layout: elk
---
graph LR
  subgraph src ["src/"]
    src_node_ts["node.ts"]
    src_index_ts["index.ts"]
    src_utils["utils/"]
    src_api["api/"]
    src_types["types/"]
    src_db["db/"]
    src_constants["constants/"]
    src_jobs["jobs/"]
  end
  subgraph src_middleware ["src/middleware/"]
    src_middleware_logger["logger/"]
    src_middleware_errorHandler["errorHandler/"]
    src_middleware_cache["cache/"]
    src_middleware_doc["doc/"]
    src_middleware_cors["cors/"]
    src_middleware_encapsulation["encapsulation/"]
    src_middleware_auth["auth/"]
    src_middleware_serverTiming["serverTiming/"]
    src_middleware_serveStatic["serveStatic/"]
  end
  subgraph src_utils ["src/utils/"]
    src_utils_i18n["i18n/"]
    src_utils_storage["storage/"]
  end
  subgraph src_api ["src/api/"]
    src_api_i18n["i18n/"]
    src_api_system["system/"]
    src_api_mail["mail/"]
    src_api_maintenance["maintenance/"]
    src_api_oss["oss/"]
    src_api_enterprise["enterprise/"]
    src_api_ai["ai/"]
    src_api_swarm["swarm/"]
  end
  subgraph src_middleware_errorHandler ["src/middleware/errorHandler/"]
    src_middleware_errorHandler_businessError["businessError/"]
    src_middleware_errorHandler_sqlError["sqlError/"]
  end
  subgraph src_api_system ["src/api/system/"]
    src_api_system_auth["auth/"]
  end
  subgraph src_db ["src/db/"]
    src_db_translation["translation/"]
  end
  subgraph src_utils_storage ["src/utils/storage/"]
    src_utils_storage_providers["providers/"]
  end
  src_node_ts --> src_index_ts
  src_node_ts --> src_utils
  src_node_ts --> src_jobs
  src_index_ts --> src_middleware_logger
  src_index_ts --> src_middleware_errorHandler
  src_index_ts --> src_middleware_doc
  src_index_ts --> src_middleware_cors
  src_index_ts --> src_api
  src_index_ts --> src_middleware_serverTiming
  src_index_ts --> src_middleware_serveStatic
  src_index_ts --> src_utils_storage
  src_index_ts --> src_utils
  src_middleware_errorHandler --> src_utils
  src_middleware_errorHandler --> src_utils_i18n
  src_middleware_errorHandler --> src_middleware_errorHandler_businessError
  src_middleware_errorHandler --> src_middleware_errorHandler_sqlError
  src_utils_i18n --> src_utils
  src_utils_i18n --> src_middleware_cache
  src_utils_i18n --> src_api_i18n
  src_middleware_cache --> src_utils
  src_api_i18n --> src_types
  src_api_i18n --> src_db
  src_middleware_errorHandler_sqlError --> src_middleware_errorHandler_businessError
  src_middleware_cors --> src_utils
  src_api --> src_api_i18n
  src_api --> src_api_mail
  src_api --> src_api_maintenance
  src_api --> src_api_oss
  src_api --> src_api_enterprise
  src_api --> src_api_system
  src_api --> src_api_ai
  src_api --> src_api_swarm
  src_api --> src_types
  src_types --> src_api_system
  src_types --> src_utils_storage
  src_api_system --> src_api_system_auth
  src_api_system --> src_db
  src_utils_storage --> src_utils_storage_providers
  src_utils_storage --> src_api_oss
  src_api_mail --> src_types
  src_api_mail --> src_db
  src_api_maintenance --> src_types
  src_api_maintenance --> src_db
  src_api_oss --> src_db
  src_api_enterprise --> src_types
  src_api_enterprise --> src_db
  src_api_system_auth --> src_middleware_encapsulation
  src_api_system_auth --> src_utils
  src_api_system_auth --> src_middleware_errorHandler_businessError
  src_middleware_encapsulation --> src_utils
  src_middleware_encapsulation --> src_middleware_errorHandler_businessError
  src_middleware_encapsulation --> src_middleware_auth
  src_middleware_auth --> src_utils
  src_middleware_auth --> src_db
  src_middleware_auth --> src_middleware_errorHandler_businessError
  src_middleware_auth --> src_middleware_cache
  src_db --> src_utils
  src_db --> src_middleware_cache
  src_db --> src_api_ai
  src_db --> src_api_swarm
  src_db --> src_db_translation
  src_db --> src_constants
  src_middleware_serverTiming --> src_utils
  src_middleware_serveStatic --> src_utils
  src_jobs --> src_db
  src_jobs --> src_api_maintenance

  classDef entry fill:#2d5,stroke:#333,stroke-width:4px
  classDef computed fill:#f96,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5
  class src_node_ts entry
  class COMPUTED computed
```

<!-- DEPENDENCY_GRAPH_END -->
