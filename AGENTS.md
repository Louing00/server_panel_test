# AGENTS.md

## Project Overview

ServerManager is a monorepo with a NestJS backend (`server/`) and React frontend (`client/`), deployed via Docker Compose + Nginx.

## Build & Development Commands

### Backend (server/)
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run seed          # Creates admin/admin123 user
npm run dev           # Dev server at localhost:3200
npm run build         # Production build
npm run lint          # ESLint
```

### Frontend (client/)
```bash
cd client
npm install
npm run dev           # Dev server at localhost:5173 (proxies /api to 3200)
npm run build         # Production build
npm run preview       # Preview production build
npm run lint          # ESLint
```

### Docker
```bash
./deploy.sh           # Full deployment
docker compose up -d --build
docker compose down
```

## Lint & Typecheck Commands

Backend: `cd server && npm run lint`
Frontend: `cd client && npm run lint`

No separate typecheck command; TypeScript errors surface in `npm run build`.

## Key Architecture Notes

- JWT is stored in httpOnly cookie (`jwt`), CSRF-safe
- SSH credentials (password/key) are AES-256-CBC encrypted in SQLite
- WebSocket auth reads JWT from cookie header in handshake
- Metrics collector runs every 30s via @nestjs/schedule Cron
- All Prisma queries include `userId` filter for data isolation

## Database

- SQLite, file stored at path specified in `DATABASE_URL`
- Prisma client generated from `server/prisma/schema.prisma`
- Three models: `User`, `Server`, `ServerMetric`
