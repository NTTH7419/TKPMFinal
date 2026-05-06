# UniHub Workshop

Hệ thống quản lý đăng ký workshop cho sự kiện "Tuần lễ Kỹ năng & Nghề nghiệp" tại Đại học A.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | NestJS (Modular Monolith) |
| ORM | Prisma |
| Database | PostgreSQL 16 (hosted on Supabase) |
| Object Storage | Supabase Storage |
| Cache / Queue | Redis 7 (Docker) |
| Job Queue | BullMQ |
| Email | Resend |
| Auth | JWT (access 15m + refresh 7d) |
| Realtime | SSE + Redis Pub/Sub |
| Frontend | React + Vite |

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker + Docker Compose
- Supabase project (free tier is sufficient)
- Resend API key
- Gemini or OpenAI API key (optional — for AI summary)

## Local Infrastructure

Only Redis runs locally. PostgreSQL and Storage are managed by Supabase.

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

```bash
docker-compose up -d
```

## Environment Variables

Create `apps/api/.env` (copy from `apps/api/.env.example`):

```env
# Supabase (PostgreSQL + Storage)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=<anon-key>

# Redis (Docker local)
REDIS_URL=redis://localhost:6379

# Auth — use two separate secrets
JWT_ACCESS_SECRET=<secret-at-least-32-chars>
JWT_REFRESH_SECRET=<different-secret-at-least-32-chars>

# HMAC
HMAC_QR_SECRET=<secret-for-qr-signing>
HMAC_WEBHOOK_SECRET=<secret-for-webhook-verification>

# Email (Resend)
RESEND_API_KEY=re_<api-key>
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AI (optional)
GEMINI_API_KEY=<optional-for-ai-summary>
# or: OPENAI_API_KEY=<optional>
```

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Start local infrastructure
docker-compose up -d

# 3. Run database migrations (against Supabase PostgreSQL)
cd apps/api
npx prisma migrate dev

# 4. Seed initial roles
npx prisma db seed

# 5. Start dev server
pnpm run dev
```

## Monorepo Structure

```
apps/
├── api/          # NestJS backend (Modular Monolith + BullMQ workers)
├── student-web/  # React + Vite — student-facing UI
├── admin-web/    # React + Vite — organizer/admin UI
└── checkin-pwa/  # React + Vite + vite-plugin-pwa — offline-first check-in
packages/
└── shared/       # DTOs, enums, shared constants
```

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Copy the **Connection Pooling URL** from Project Settings → Database → Connection string → URI → set as `DATABASE_URL`.
3. Copy **Project URL** and **anon key** from Project Settings → API.
4. Create the following Storage buckets (all **private**):
   - `workshop-docs` — PDF uploads by organizers
   - `student-imports` — CSV files from legacy system
   - `qr-codes` — QR images generated after registration confirmed

## Documentation

| File | Description |
|---|---|
| [`backend-architecture.md`](backend-architecture.md) | Full backend architecture reference |
| [`openspec/changes/build-unihub-workshop/proposal.md`](openspec/changes/build-unihub-workshop/proposal.md) | Feature proposal |
| [`openspec/changes/build-unihub-workshop/design.md`](openspec/changes/build-unihub-workshop/design.md) | Technical design decisions |
| [`openspec/changes/build-unihub-workshop/tasks.md`](openspec/changes/build-unihub-workshop/tasks.md) | Implementation task list |
| [`docs/blueprint/`](docs/blueprint/) | Original blueprint specifications |
