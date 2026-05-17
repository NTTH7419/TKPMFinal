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

# 2. Start local infrastructure (Redis)
docker-compose up -d

# 3. Run database migrations (against Supabase PostgreSQL)
cd apps/api
npx prisma migrate dev

# 4. Seed initial roles
npx prisma db seed

# 5a. Start all apps together (recommended)
pnpm run dev

# 5b. Or start each app individually:
pnpm run dev:api      # NestJS API on http://localhost:3000
pnpm run dev:student  # Student web on http://localhost:5173
pnpm run dev:admin    # Admin web on http://localhost:5174
pnpm run dev:checkin  # Check-in PWA on http://localhost:5175
```

## Running Tests

```bash
# Unit tests (API only)
pnpm --filter api run test

# Unit tests with coverage
pnpm --filter api run test:cov

# Lint all workspaces
pnpm run lint

# Build all apps
pnpm run build
```

## Monorepo Structure

```
apps/
├── api/          # NestJS backend (Modular Monolith + BullMQ workers)
├── student-web/  # React + Vite — student-facing UI
├── admin-web/    # React + Vite — organizer/admin UI
└── checkin-pwa/  # React + Vite + vite-plugin-pwa — offline-first check-in
packages/
├── shared/       # DTOs, enums, shared constants
└── ui/           # Design-token library (Tailwind preset, CSS variables, fonts)
```

## Design System (Token System)

Thiết kế giao diện tuân theo [`DESIGN.md`](DESIGN.md) — mọi token màu sắc, typography, spacing đều được code hóa tại [`packages/ui/src/tokens/tokens.ts`](packages/ui/src/tokens/tokens.ts).

| Import | Dùng để |
|---|---|
| `@unihub/ui/tailwind-preset` | Tailwind preset cho tất cả 3 frontend app |
| `@unihub/ui/tokens.css` | CSS variables (`--color-*`, `--space-*`, `--rounded-*`, ...) |
| `@unihub/ui/fonts.css` | Font Inter Variable + biến `--font-sans` |
| `@unihub/ui/tokens` | TS object + type exports (`ColorToken`, v.v.) |
| `@unihub/ui/components` | Primitive React components (Button, Card, Input, Badge, Tabs) — see the **Components** tab in the preview |
| `@unihub/ui/utilities.css` | `focus-ring` utility consumed by every interactive primitive |

```bash
# Xem preview toàn bộ tokens & components (Tokens / Components tabs)
pnpm --filter @unihub/ui dev
# → http://localhost:6006

# Rebuild sau khi sửa tokens
pnpm --filter @unihub/ui build
```

Chi tiết: [`packages/ui/README.md`](packages/ui/README.md)

## Supabase Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **"New Project"** and fill in:
   - **Name:** UniHub Workshop (or any name)
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest to your location (Singapore recommended for Vietnam)
3. Wait for project creation (~1-2 minutes)

### Step 2: Get Database Connection URL
1. Go to **Project Settings** → **Database**
2. Under **Connection string**, select **"Connection pooling"** (recommended)
3. Copy the full URL (it looks like: `postgresql://postgres.xxxxx:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres`)
4. **Replace `[PASSWORD]`** with the password you created in Step 1
5. Set this as `DATABASE_URL` in `apps/api/.env`:
   ```env
   DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres
   ```

### Step 3: Get API Keys
1. Go to **Project Settings** → **API**
2. Copy the values:
   - **Project URL** → set as `SUPABASE_URL`
   - **anon public key** → set as `SUPABASE_ANON_KEY`
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 4: Initialize Database Schema
Run migrations to create all tables:
```bash
cd apps/api
npx prisma migrate deploy
```

If this is your **first time**, use:
```bash
npx prisma migrate dev
```
This will:
- Create all tables based on `schema.prisma`
- Run migrations in `prisma/migrations/`
- Seed demo data automatically (if `prisma.seed` is configured)

### Step 5: Seed Initial Data
```bash
pnpm --filter api run db:seed
```

#### Seed Strategy: Independent Data Only

The seed script follows a **data isolation pattern** — it seeds only **independent entities**. Relational data (registrations, payments, check-in events, notifications) are **NOT seeded** because:

1. **Avoiding data coupling:** Different test scenarios require different relationships
2. **Clean user testing:** When users register, they create their own registrations without conflicts from pre-seeded data
3. **Realistic workflow:** Students auto-link to User accounts when they register with matching email (not seeded)

#### What Gets Seeded

**Roles & Non-Student Users:**
- `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN` roles
- 4 non-student users: admin, organizer, staff (×2)
  - **Admin:** `admin@unihub.edu.vn` / `Admin@123456`
  - **Organizer:** `organizer@unihub.edu.vn` / `Organizer@123`
  - **Staff:** `staff@unihub.edu.vn` / `Staff@123`

**Student Records (Import Batch):**
- 7 independent Student records with unique emails:
  - `SE123456` / `student1@unihub.edu.vn` — Nguyễn Văn A
  - `SE123457` / `student2@unihub.edu.vn` — Trần Thị B
  - ... (5 more)
- **Students are NOT linked to User accounts** — they auto-link when they register via email matching

**Workshops:**
- 7 independent workshops with various states:
  - 4 OPEN (FREE + PAID)
  - 1 DRAFT
  - 1 CLOSED (past event)
  - 1 CANCELLED

**Student Import Batch:**
- 1 batch with 9 rows: 7 VALID + 1 ERROR + 1 DUPLICATE (for testing import flow)

#### Test Workflow

To test the full registration flow:

1. **Register as a student** using one of the seeded student emails:
   ```
   Email: student1@unihub.edu.vn
   Password: any password you choose
   ```
   This automatically:
   - Creates a new User account
   - Links to the seeded Student record (via `auth.service.ts`)
   - Assigns STUDENT role
   - Allows registration for workshops

2. **Then test registration flow** (FREE or PAID workshops)
3. **Admins can check imports** — see the batch with 9 rows including validation errors

### Step 6: Create Storage Buckets
1. Go to **Storage** in Supabase dashboard
2. Create the following buckets (all **private**):
   - **`workshop-docs`** — PDF uploads by organizers for AI summary
   - **`student-imports`** — CSV files imported from legacy system
   - **`qr-codes`** — QR code images generated after registration confirmed

For each bucket:
- Click **New bucket**
- Set name (e.g., `workshop-docs`)
- Toggle **"Private"** (ensure it's private, not public)
- Click **Create bucket**

### Verify Setup
After migration and seeding, verify everything is correct:
```bash
# Check if all tables exist
npx prisma studio

# This opens interactive UI at http://localhost:5555
# Browse through: Users, Students, Workshops, Registrations, Payments, etc.
```

**Demo Accounts to test with:**
- **Admin:** `admin@unihub.edu.vn` / `Admin@123456`
- **Organizer:** `organizer@unihub.edu.vn` / `Organizer@123`
- **Staff:** `staff@unihub.edu.vn` / `Staff@123`
- **Student:** `student@unihub.edu.vn` / `Student@123` (linked to SE123456)

## Documentation

| File | Description |
|---|---|
| [`backend-architecture.md`](backend-architecture.md) | Full backend architecture reference |
| [`openspec/changes/build-unihub-workshop/proposal.md`](openspec/changes/build-unihub-workshop/proposal.md) | Feature proposal |
| [`openspec/changes/build-unihub-workshop/design.md`](openspec/changes/build-unihub-workshop/design.md) | Technical design decisions |
| [`openspec/changes/build-unihub-workshop/tasks.md`](openspec/changes/build-unihub-workshop/tasks.md) | Implementation task list |
| [`docs/blueprint/`](docs/blueprint/) | Original blueprint specifications |
