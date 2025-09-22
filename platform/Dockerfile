
FROM registry.cn-hangzhou.aliyuncs.com/one-registry/node:latest AS builder

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 设置国内源并安装依赖
RUN pnpm config set registry https://registry.npmmirror.com
RUN pnpm install

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# Production stage
FROM registry.cn-hangzhou.aliyuncs.com/one-registry/nginx:latest

# 复制自定义nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 从builder阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建nginx日志目录
RUN mkdir -p /var/log/nginx

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]