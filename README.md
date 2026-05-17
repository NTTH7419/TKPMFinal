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
## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Start local infrastructure (Redis)
docker-compose up -d

# 3. Apply database migrations (uses .env from apps/api/)
cd apps/api
npx prisma migrate deploy

# 4. Start all apps
cd ../..
pnpm run dev

# Or start individual apps:
pnpm run dev:api      # NestJS API on http://localhost:3000
pnpm run dev:student  # Student web on http://localhost:5173
pnpm run dev:admin    # Admin web on http://localhost:5174
pnpm run dev:checkin  # Check-in PWA on http://localhost:5175
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

## Demo Accounts (Pre-Seeded)

Use these accounts to test immediately (no registration needed):

**Non-Student Accounts:**
- **Admin:** `admin@unihub.edu.vn` / `Admin@123456`
- **Organizer:** `organizer@unihub.edu.vn` / `Organizer@123`
- **Staff:** `staff@unihub.edu.vn` / `Staff@123`

**Student Accounts (7 linked accounts for testing):**
- `student1@unihub.edu.vn` / `Student@123` (SE123456 — Nguyễn Văn A)
- `student2@unihub.edu.vn` / `Student@123` (SE123457 — Trần Thị B)
- `student3@unihub.edu.vn` / `Student@123` (SE123458 — Lê Văn C)
- `student4@unihub.edu.vn` / `Student@123` (SE123459 — Phạm Thị D)
- `student5@unihub.edu.vn` / `Student@123` (SE123460 — Hoàng Văn E)
- `it000001@student.edu.vn` / `Student@123` (IT000001 — Ngô Thị F)
- `it000002@student.edu.vn` / `Student@123` (IT000002 — Đinh Văn G)

## For Local Development (Creating Your Own Supabase)

If you need your own independent testing database, follow these steps:

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
npx prisma migrate dev
```

This will:
- Create all tables based on `schema.prisma`
- Run migrations in `prisma/migrations/`
- Seed demo data automatically

### Step 5: Create Storage Buckets
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

### Step 6: Verify Setup
After migration and seeding, verify everything is correct:
```bash
cd apps/api
npx prisma studio
# Opens http://localhost:5555 — browse Users, Students, Workshops, etc.
```

### Seed Strategy: Independent Data Only

The seed script follows a **data isolation pattern** — it seeds only **independent entities**. Relational data (registrations, payments, check-in events) are **NOT seeded** because:

1. **Avoiding data coupling:** Different test scenarios require different relationships
2. **Clean user testing:** When users register, they create their own registrations without conflicts from pre-seeded data
3. **Multi-user isolation:** Each student sees only their own registrations via JWT auth

#### What Gets Seeded

**Roles & Non-Student Users:**
- `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN` roles
- 4 non-student users: admin, organizer, staff (×2)

**Student Records (7 Independent):**
- Each with unique email and student code
- All linked to User accounts with password `Student@123`
- Pre-seeded registrations (1 FREE confirmed, 1 PAID pending) for testing

**Workshops (7 Independent):**
- 4 OPEN (FREE + PAID mixed)
- 1 DRAFT
- 1 CLOSED (past event)
- 1 CANCELLED

**Student Import Batch:**
- 1 batch with 9 rows: 7 VALID + 1 ERROR + 1 DUPLICATE (for testing import flow)

#### Test Workflow

1. **Login as student1:**
   ```
   Email: student1@unihub.edu.vn
   Password: Student@123
   ```
2. **View pre-seeded registrations:**
   - Navigate to "Đăng ký của tôi" (My Registrations)
   - Should see 1 FREE workshop confirmed
3. **Switch accounts** → Login as student2 → See different registrations (1 PAID pending)
4. **Test registration flow** → Register for a new workshop
5. **Verify data isolation** → Login as student3 → Should NOT see student1's or student2's registrations

## Documentation

| File | Description |
|---|---|
| [`backend-architecture.md`](backend-architecture.md) | Full backend architecture reference |
| [`openspec/changes/build-unihub-workshop/proposal.md`](openspec/changes/build-unihub-workshop/proposal.md) | Feature proposal |
| [`openspec/changes/build-unihub-workshop/design.md`](openspec/changes/build-unihub-workshop/design.md) | Technical design decisions |
| [`openspec/changes/build-unihub-workshop/tasks.md`](openspec/changes/build-unihub-workshop/tasks.md) | Implementation task list |
| [`docs/blueprint/`](docs/blueprint/) | Original blueprint specifications |
