# 🏗️ 构建阶段：安装依赖 + 编译
FROM node:18 AS builder

WORKDIR /usr/src/app

ENV TZ=Asia/Shanghai
ENV PORT=3000
ENV BIND_ADDRESS=0.0.0.0
ENV CDN_SIZE_LIMIT_MB=2048

COPY . .

# 编译前端，输出到根目录的public
RUN cd frontend; npm ci && npm run build

# 安装后端依赖
RUN npm ci

# 🚀 运行阶段：只复制构建产物和必要依赖
FROM node:18-slim AS runner

WORKDIR /usr/src/app

# 只复制必要文件（避免带入开发依赖）
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/data ./data
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/server.js ./

EXPOSE 3000

CMD ["node", "server.js"]