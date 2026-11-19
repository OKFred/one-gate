FROM registry.cn-hangzhou.aliyuncs.com/one-registry/node:latest AS builder

# 设置工作目录
WORKDIR /app

# 启用 corepack 并锁定 pnpm 版本
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

# 复制根级工作区与前端依赖清单并安装依赖
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/contracts/package.json ./packages/contracts/
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

# 设置国内源并按前端依赖图安装
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile --filter "@hodor/web-*" --filter platform-root

# 复制共享契约与前端源代码并构建三端应用
COPY packages/contracts ./packages/contracts
COPY platform ./platform
RUN pnpm --dir platform run build:all

# Production stage
FROM registry.cn-hangzhou.aliyuncs.com/one-registry/nginx:latest

# 复制自定义 nginx 配置
COPY platform/nginx.conf /etc/nginx/nginx.conf

# 从 builder 阶段复制三端构建产物
COPY --from=builder /app/platform/apps/admin/dist /usr/share/nginx/html
COPY --from=builder /app/platform/apps/enterprise/dist /usr/share/nginx/html/enterprise
COPY --from=builder /app/platform/apps/personal/dist /usr/share/nginx/html/personal

# 创建 nginx 日志目录
RUN mkdir -p /var/log/nginx

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
