# Use Node.js image
FROM registry.cn-hangzhou.aliyuncs.com/one-registry/node:latest

# 设置工作目录
WORKDIR /app

# 复制 package 文件并安装依赖
COPY package*.json ./
COPY pnpm-*.yaml ./

# 设置国内源
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm
# 设置国内源
RUN pnpm config set registry https://registry.npmmirror.com
RUN pnpm install

# 复制所有源代码
COPY . .
RUN pnpm run build
RUN mkdir -p dist/db/sql && cp -r src/db/sql/. dist/db/sql/

EXPOSE 8787

# 执行启动命令
CMD ["pnpm", "run" ,"start"]