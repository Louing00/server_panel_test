# ServerPanel

<p align="center">
  <strong>基于 Web 的服务器管理面板，支持终端操控、文件管理和实时资源监控。</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/后端-NestJS-ea2845?logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/前端-React-61dafb?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/ORM-Prisma-2d3748?logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/数据库-SQLite-003b57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/部署-Docker-2496ed?logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/代理-Nginx-009639?logo=nginx&logoColor=white" alt="Nginx">
</p>

---

## 系统架构

```
浏览器 ──► Nginx :80 ──┬── /api/* | /socket.io/* ──► server:3200 (NestJS)
                       └── /*                        ──► client:80  (React)

server:3200 ──SSH──► 被管理的服务器（健康检查、终端、SFTP 文件操作）
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + TypeScript + NestJS + Prisma + SQLite |
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 认证 | JWT HttpOnly Cookie + bcryptjs（12 轮哈希） |
| 图表 | chart.js + react-chartjs-2 |
| 终端 | @xterm/xterm + socket.io + ssh2 |
| 图标 | lucide-react |

## 功能特性

- **服务器管理** — 添加、编辑、删除服务器，支持 SSH 密码或私钥认证
- **健康检查** — TCP 连通性检测，在线/离线状态实时显示
- **资源监控** — CPU、内存、磁盘、网络、系统负载、运行时间，每 30 秒采集一次
- **Web 终端** — 基于 xterm.js 的全功能终端，通过 WebSocket + SSH 连接
- **文件管理** — 浏览、读取、编辑、创建、重命名、删除文件，基于 SFTP 协议
- **用户数据隔离** — 所有资源通过 `userId` 外键隔离，仅返回当前用户数据

## 截图

| 仪表盘 | 终端 | 文件管理 | 监控图表 |
|:---:|:---:|:---:|:---:|
| 服务器卡片 + 实时指标 | xterm.js SSH 终端 | SFTP 文件浏览 + 编辑器 | CPU / 内存历史折线图 |

## 快速开始

### 环境要求

- Node.js 18+
- Docker 和 Docker Compose

### 本地开发

```bash
git clone https://github.com/Louing00/server_panel_test.git
cd server_panel_test

# 后端（终端窗口 1）
cd server
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev                 # http://localhost:3200

# 前端（终端窗口 2）
cd client
npm install
npm run dev                 # http://localhost:5173
```

默认登录账号：**admin** / **admin123**

### Docker 一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

运行后按提示输入域名、是否启用 HTTPS 等信息，脚本会自动完成：
1. 生成随机密钥写入 `.env`
2. 根据域名生成 Nginx 配置
3. 构建镜像并启动 server + client + nginx 三个容器
4. 如开启 `--ssl`，自动获取 Let's Encrypt 证书并配置每天凌晨 3 点自动续期

## API 接口

### 认证
- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录（写入 httpOnly Cookie）
- `POST /api/auth/logout` — 退出登录（清除 Cookie）
- `GET /api/auth/me` — 获取当前用户信息

### 服务器
- `GET /api/servers` — 列出当前用户的服务器
- `POST /api/servers` — 添加服务器
- `PUT /api/servers/:id` — 编辑服务器
- `DELETE /api/servers/:id` — 删除服务器
- `POST /api/servers/:id/health` — 手动触发健康检查

### 文件管理
- `GET /api/servers/:id/files?path=/` — 列出目录内容
- `GET /api/servers/:id/files/read?path=...` — 读取文件
- `POST /api/servers/:id/files/write` — 写入文件 `{path, content}`
- `DELETE /api/servers/:id/files?path=...` — 删除文件/目录
- `POST /api/servers/:id/files/mkdir` — 创建目录 `{path}`
- `POST /api/servers/:id/files/rename` — 重命名/移动 `{oldPath, newPath}`

### 资源监控
- `GET /api/servers/:id/metrics/latest` — 最新监控快照
- `GET /api/servers/:id/metrics?from=&to=` — 历史监控数据

### 终端（WebSocket）
- `terminal:connect {serverId, cols, rows}` — 建立 SSH 会话
- `terminal:input <string>` — 发送标准输入
- `terminal:resize {cols, rows}` — 调整终端大小
- `terminal:output <string>` — 接收标准输出/错误
- `terminal:connected` — 会话已连接
- `terminal:error <string>` — 错误信息
- `terminal:close` — 会话已关闭

## 目录结构

```
ServerManager/
├── deploy.sh                  # 一键部署脚本
├── docker-compose.yml         # Docker Compose 编排
├── .env.example               # 环境变量示例
├── docker/nginx/nginx.conf    # Nginx 反向代理配置（ServerPanel 内置用）
│   └── ...
├── nginx/                      # 独立 Nginx 部署工具
│   ├── deploy-nginx.sh         # Nginx 一键部署脚本
│   ├── docker-compose.yml      # Nginx + Certbot 服务
│   ├── nginx.conf              # Nginx 主配置
│   └── conf.d/                 # 站点配置模板
├── server/                    # NestJS 后端
│   ├── prisma/schema.prisma   # 数据库模型
│   └── src/
│       ├── auth/              # JWT + bcryptjs 认证
│       ├── user/              # 用户管理
│       ├── server/            # 服务器 CRUD + 健康检查
│       ├── terminal/          # WebSocket SSH 终端
│       ├── file/              # SFTP 文件管理
│       ├── metrics/           # 资源监控采集
│       └── common/            # 守卫、装饰器、过滤器
└── client/                    # React 前端
    └── src/
        ├── api/               # Axios 请求封装
        ├── context/           # 认证上下文
        ├── hooks/             # useAuth、useWebSocket
        ├── pages/             # 登录、仪表盘、服务器详情
        ├── components/        # 布局、侧栏、终端、文件管理等组件
        └── types/             # TypeScript 类型定义
```

## 默认账号

执行 `npm run seed` 后将创建：

- 用户名：`admin`
- 密码：`admin123`

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 后端监听端口（默认 3200） |
| `DATABASE_URL` | SQLite 数据库路径 |
| `JWT_SECRET` | JWT 签名密钥 |
| `ENCRYPTION_KEY` | SSH 凭证 AES-256 加密密钥 |

## 独立 Nginx 部署

项目附带独立的 Nginx 一键部署工具，可用于任意项目的反向代理：

```bash
cd nginx
chmod +x deploy-nginx.sh
./deploy-nginx.sh
```

按提示输入域名、后端地址、是否启用 HTTPS，自动完成 Nginx + Let's Encrypt 证书部署。

## 许可证

MIT
