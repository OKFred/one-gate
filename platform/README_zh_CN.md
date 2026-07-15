# RBAC 管理后台

权限管理系统的官方管理后台。采用 React 19 与 MUI v7 构建，提供流畅、专业的响应式管理体验。

## 🚀 核心技术栈

- **React 19**：现代化的 UI 组件库与状态管理。
- **MUI v7**：工业级的 UI 设计规范与组件。
- **Vite 7**：下一代前端构建工具，提供极速的热重载。
- **Axios**：可扩展的 HTTP 请求客户端。
- **React Router 7**：强大的单页应用路由管理。

## 🛠️ 快速上手

### 1. 环境准备

- **Node.js** (推荐 v18+)
- **pnpm** (包管理工具)

### 2. 环境配置

在 `platform/` 目录下创建 `.env.development` 文件，配置后端 API 的基地址：

```env
VITE_API_URL=http://localhost:3000
```

### 3. 安装与启动

```bash
pnpm install
pnpm run dev
```

管理后台默认运行在 `http://localhost:5173`。

## 📦 核心脚本

- `pnpm run dev`：启动本地开发预览。
- **`pnpm run build`**：执行生产环境构建。
- `pnpm run lint`：执行代码风格检查。
- `pnpm run i18n:scan`：自动扫描源代码中的国际化 Key。

---

[English Version (README.md)](README.md)
