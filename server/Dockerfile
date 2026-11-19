# Use Node.js image
FROM registry.cn-hangzhou.aliyuncs.com/one-registry/node:latest

# 设置工作目录
WORKDIR /app

# 启用 corepack 并锁定 pnpm 版本
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

# 复制根级工作区与后端依赖清单并安装依赖
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/
COPY server/apps/server/package.json ./server/apps/server/
COPY server/packages/core/package.json ./server/packages/core/
COPY server/packages/admin/package.json ./server/packages/admin/
COPY server/packages/enterprise/package.json ./server/packages/enterprise/
COPY server/packages/personal/package.json ./server/packages/personal/
COPY platform/package.json ./platform/
COPY platform/packages/ui/package.json ./platform/packages/ui/
COPY platform/apps/admin/package.json ./platform/apps/admin/
COPY platform/apps/enterprise/package.json ./platform/apps/enterprise/
COPY platform/apps/personal/package.json ./platform/apps/personal/

# 设置国内源并按后端依赖图安装
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile --filter "@hodor/server..." --filter rbac-monorepo-root

# 复制后端源代码并构建
COPY server ./server
RUN pnpm --dir server run build

WORKDIR /app/server
RUN mkdir -p /app/logs && ln -sfn /app/logs /app/server/logs

EXPOSE 8787

# 执行启动命令
CMD ["pnpm", "run", "start"]
