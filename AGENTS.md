# AGENTS.md

## 项目概述

ServerManager 是一个 monorepo，包含 NestJS 后端（`server/`）和 React 前端（`client/`），通过 Docker Compose + Nginx 部署。

## 构建和开发命令

### 后端（server/）
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run seed          # 创建 admin/admin123 用户
npm run dev           # 开发服务器，监听 localhost:3200
npm run build         # 生产构建
npm run lint          # ESLint 检查
```

### 前端（client/）
```bash
cd client
npm install
npm run dev           # 开发服务器，监听 localhost:5173（代理 /api 到 3200）
npm run build         # 生产构建
npm run preview       # 预览生产构建
npm run lint          # ESLint 检查
```

### Docker
```bash
./deploy.sh                      # 交互式部署，按提示输入域名等信息
docker compose up -d --build
docker compose down
```

## Lint 和类型检查命令

后端：`cd server && npm run lint`
前端：`cd client && npm run lint`

没有单独的类型检查命令；TypeScript 类型错误会在 `npm run build` 时暴露。

## 关键架构说明

- JWT 存储在 httpOnly Cookie（`jwt`）中，天然防 CSRF
- SSH 凭证（密码/密钥）在 SQLite 中使用 AES-256-CBC 加密存储
- WebSocket 认证通过读取握手时的 cookie 头解析 JWT
- 资源监控采集器每 30 秒通过 @nestjs/schedule 定时任务执行
- 所有 Prisma 查询均包含 `userId` 过滤条件，实现数据隔离

## 数据库

- SQLite，数据库文件路径由 `DATABASE_URL` 环境变量指定
- Prisma Client 通过 `server/prisma/schema.prisma` 生成
- 三个模型：`User`（用户）、`Server`（服务器）、`ServerMetric`（监控指标）
