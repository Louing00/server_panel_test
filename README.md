# ServerPanel

<p align="center">
  <strong>Web-based server management panel with terminal access, file manager, and real-time resource monitoring.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/backend-NestJS-ea2845?logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/frontend-React-61dafb?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/orm-Prisma-2d3748?logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/db-SQLite-003b57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/deploy-Docker-2496ed?logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/proxy-Nginx-009639?logo=nginx&logoColor=white" alt="Nginx">
</p>

---

## Architecture

```
Browser ──► Nginx :80 ──┬── /api/* | /socket.io/* ──► server:3200 (NestJS)
                        └── /*                        ──► client:80  (React)

server:3200 ──SSH──► Managed servers (health check, terminal, SFTP)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript + NestJS + Prisma + SQLite |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Auth | JWT HttpOnly Cookie + bcryptjs (12 rounds) |
| Charts | chart.js + react-chartjs-2 |
| Terminal | @xterm/xterm + socket.io + ssh2 |
| Icons | lucide-react |

## Features

- **Server Management** — Add, edit, remove servers with SSH password or private key auth
- **Health Check** — TCP connectivity test with online/offline status indicator
- **Resource Monitoring** — CPU, memory, disk, network, load average, uptime — collected every 30s
- **Web Terminal** — Full-featured xterm.js terminal via WebSocket + SSH
- **File Manager** — Browse, read, edit, create, rename, delete files via SFTP
- **User Data Isolation** — All resources scoped to authenticated user via `userId`

## Screenshots

| Dashboard | Terminal | File Manager | Metrics |
|:---:|:---:|:---:|:---:|
| Server cards with live metrics | xterm.js SSH terminal | SFTP file browser + editor | CPU/Memory history chart |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### Local Development

```bash
git clone https://github.com/Louing00/server_panel_test.git
cd server_panel_test

# Backend (terminal 1)
cd server
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev                 # http://localhost:3200

# Frontend (terminal 2)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Default login: **admin** / **admin123**

### Docker Deployment

```bash
chmod +x deploy.sh
./deploy.sh                 # One-click deploy
# Open http://localhost
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login (sets httpOnly cookie)
- `POST /api/auth/logout` — Logout (clears cookie)
- `GET /api/auth/me` — Current user info

### Servers
- `GET /api/servers` — List user's servers
- `POST /api/servers` — Add server
- `PUT /api/servers/:id` — Update server
- `DELETE /api/servers/:id` — Delete server
- `POST /api/servers/:id/health` — Trigger health check

### Files
- `GET /api/servers/:id/files?path=/` — List directory
- `GET /api/servers/:id/files/read?path=...` — Read file
- `POST /api/servers/:id/files/write` — Write file `{path, content}`
- `DELETE /api/servers/:id/files?path=...` — Delete file/dir
- `POST /api/servers/:id/files/mkdir` — Create directory `{path}`
- `POST /api/servers/:id/files/rename` — Rename `{oldPath, newPath}`

### Metrics
- `GET /api/servers/:id/metrics/latest` — Latest metrics snapshot
- `GET /api/servers/:id/metrics?from=&to=` — Historical metrics

### Terminal (WebSocket)
- `terminal:connect {serverId, cols, rows}` — Establish SSH session
- `terminal:input <string>` — Send stdin
- `terminal:resize {cols, rows}` — Resize terminal
- `terminal:output <string>` — Receive stdout/stderr
- `terminal:connected` — Session connected
- `terminal:error <string>` — Error message
- `terminal:close` — Session closed

## Directory Structure

```
ServerManager/
├── deploy.sh                  # One-click deployment
├── docker-compose.yml
├── .env.example
├── docker/nginx/nginx.conf
├── server/                    # NestJS backend
│   ├── prisma/schema.prisma
│   └── src/
│       ├── auth/              # JWT + bcryptjs auth
│       ├── user/              # User profile
│       ├── server/            # Server CRUD + health check
│       ├── terminal/          # WebSocket SSH terminal
│       ├── file/              # SFTP file management
│       ├── metrics/           # Resource monitoring
│       └── common/            # Guards, decorators, filters
└── client/                    # React frontend
    └── src/
        ├── api/               # Axios API clients
        ├── context/           # AuthContext
        ├── hooks/             # useAuth, useWebSocket
        ├── pages/             # Login, Dashboard, ServerDetail
        ├── components/        # Layout, Sidebar, Terminal, FileExplorer, etc.
        └── types/             # TypeScript interfaces
```

## Default Credentials

After running `npm run seed`:

- Username: `admin`
- Password: `admin123`

## Environment Variables

| Variable | Description |
|----------|------------|
| `PORT` | Backend listen port (default 3200) |
| `DATABASE_URL` | SQLite database path |
| `JWT_SECRET` | JWT signing secret |
| `ENCRYPTION_KEY` | AES-256 key for SSH credential encryption |

## License

MIT
