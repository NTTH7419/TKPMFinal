# Đồng bộ 3 file OpenSpec với Backend Architecture (Hybrid Stack)

Cập nhật `proposal.md`, `design.md`, và `tasks.md` trong `openspec/changes/build-unihub-workshop/` để phản ánh kiến trúc **Hybrid** đã được thống nhất, kết hợp ưu điểm của cả `backend-architecture.md` và 3 file OpenSpec hiện tại.

## Kiến trúc Hybrid đã thống nhất

```
Managed services (không cần Docker):
  ✅ Supabase   → PostgreSQL host + Object Storage
  ✅ Resend     → Email transactional

Docker local (chỉ còn 1 service):
  ✅ Redis 7    → BullMQ, rate limit, virtual queue, circuit breaker, JWT blocklist

Giữ nguyên từ backend-architecture.md:
  ✅ SSE + Redis Pub/Sub   → Realtime seat count (KHÔNG dùng Supabase Realtime)
  ✅ NestJS Modular Monolith + Prisma ORM
  ✅ BullMQ background workers
  ✅ Custom JWT/RBAC (KHÔNG dùng Supabase Auth)
```

> [!IMPORTANT]
> **Tại sao KHÔNG dùng Supabase Realtime?**
> Supabase Realtime (Postgres Changes) cho phép frontend subscribe thẳng vào DB,
> bypass hoàn toàn backend API. Điều này vi phạm thiết kế SSE endpoint của NestJS
> và bị giới hạn 200 concurrent connections ở free tier. SSE + Redis Pub/Sub
> là lựa chọn đúng và phù hợp hơn để demonstrate pattern.

> [!IMPORTANT]
> **Tại sao KHÔNG dùng Supabase Auth?**
> Dự án tự build JWT access token (15m) + refresh token rotation (7d) với NestJS Guard
> và RBAC 4 roles. Dùng Supabase Auth song song sẽ tạo 2 hệ thống auth xung đột nhau.

---

## Bảng thay đổi so với 2 file gốc

| # | Hạng mục | `backend-architecture.md` | OpenSpec cũ | **Hybrid mới** |
|---|---|---|---|---|
| 1 | **PostgreSQL** | Docker local | Supabase | **Supabase** (zero code change, Prisma dùng DATABASE_URL) |
| 2 | **Object Storage** | MinIO Docker | Supabase Storage | **Supabase Storage** (thay MinIO) |
| 3 | **Email** | Mailpit/SMTP Docker | Resend SDK | **Resend** (API key, không cần container) |
| 4 | **Redis** | Redis 7 Docker | Upstash Redis | **Redis 7 Docker** (BullMQ cần native ioredis) |
| 5 | **Realtime** | SSE + Redis Pub/Sub | Supabase Realtime | **SSE + Redis Pub/Sub** (giữ nguyên pattern gốc) |
| 6 | **Monorepo** | npm đơn giản | pnpm workspaces | **pnpm workspaces** (giữ nguyên) |
| 7 | **Student Web** | React/Next.js | React + Vite | **React + Vite** (giữ nguyên) |
| 8 | **Admin Web** | Next.js SSR | React + Vite | **React + Vite** (giữ nguyên) |
| 9 | **Workshop status** | `OPEN` | `PUBLISHED` | **`OPEN`** — theo backend-architecture.md |
| 10 | **Hold slot** | 10 phút | 15 phút | **10 phút** — theo backend-architecture.md và config.yaml |
| 11 | **Payment reconcile** | 15 phút | 5 phút | **15 phút** — theo backend-architecture.md |
| 12 | **Circuit breaker** | 5 failures OR >50%/30s; gateway timeout 5s | 5 failures/30s only | **Thêm OR condition + 5s timeout** |
| 13 | **JWT config** | 1 key `JWT_SECRET` | 2 keys tách biệt | **2 keys** — tách access/refresh secret là practice tốt hơn |
| 14 | **Docker Compose** | 4 services | N/A | **1 service** (chỉ redis) |

---

## Proposed Changes

### proposal.md

#### [MODIFY] [proposal.md](file:///c:/Users/PC/Desktop/HKVIII/Software%20design/Code/TKPMFinal/openspec/changes/build-unihub-workshop/proposal.md)

**Thay đổi 1 — Section "What Changes" (dòng 7-13):**
- Cập nhật: `Supabase (PostgreSQL + Realtime + Storage)` → `Supabase (PostgreSQL + Storage)` — bỏ Realtime
- Cập nhật: `Upstash Redis` → `Redis 7 (Docker)`
- Giữ: `Resend (email)` ✅
- Giữ: `pnpm workspaces, 5 packages` ✅
- Giữ: `React + Vite` cho student-web và admin-web ✅

**Thay đổi 2 — Section "Capabilities" (dòng 17-27):**
- `workshop-catalog`: `Supabase Realtime (Postgres Changes)` → `SSE endpoint + Redis Pub/Sub`
- `registration`: hold slot `15 min` → **`10 min`**
- `payment`: reconcile `every 5 minutes` → **`every 15 minutes`**

**Thay đổi 3 — Section "Impact" (dòng 33-39):**
- `Supabase (PostgreSQL + Realtime + Storage)` → `Supabase (PostgreSQL + Storage)`
- Thêm: `Redis 7 (Docker)` vào danh sách tech stack
- External services: bỏ `Upstash Redis instance`
- Thêm: `Redis 7 via Docker Compose (1 container)`

---

### design.md

#### [MODIFY] [design.md](file:///c:/Users/PC/Desktop/HKVIII/Software%20design/Code/TKPMFinal/openspec/changes/build-unihub-workshop/design.md)

**Thay đổi 1 — Decision D3 (dòng 35-38): Realtime** ← Thay đổi lớn nhất
- Xóa: `Supabase Realtime (Postgres Changes)`
- Thay bằng:
  - **Decision**: SSE endpoint `GET /workshops/:id/seats` trên NestJS + Redis Pub/Sub `ws:{workshop_id}:seats`
  - **Rationale**: Supabase Realtime bypass backend API; free tier 200 connections không đủ cho 12k users; SSE pattern phù hợp demonstrate kiến trúc hơn
  - **Limitation**: SSE là one-directional — đủ cho seat count

**Thay đổi 2 — Decision D4 (dòng 40-43): Redis**
- `Upstash Redis (managed, HTTP-based SDK)` → `Redis 7 (self-hosted via Docker)`
- **Rationale**: BullMQ yêu cầu native Redis connection (`ioredis`), không hỗ trợ Upstash HTTP SDK

**Thay đổi 3 — Decision D5 (dòng 45-48): Mock Payment**
- Thêm: gateway call timeout = **5 giây**

**Thay đổi 4 — Thêm Decision D11: Supabase as Infrastructure**
```
Decision: Dùng Supabase chỉ như PostgreSQL host và Object Storage.
Rationale: Prisma không đổi code khi đổi DATABASE_URL.
  Supabase Storage thay MinIO, tiết kiệm 1 Docker container.
  KHÔNG dùng Supabase Auth (xung đột custom JWT/RBAC).
  KHÔNG dùng Supabase Realtime (giới hạn connections, bypass backend).
```

**Thay đổi 5 — Risks/Trade-offs (dòng 71-78):**
- Xóa: `Supabase Realtime limits` — không còn dùng
- Xóa: `BullMQ + Upstash Redis connection issues` — đã chuyển sang Redis Docker
- Thêm: `Redis Docker single point of failure` — mitigated bằng Docker volume + AOF
- Thêm: `Supabase Storage free tier (1GB)` — đủ cho academic project

---

### tasks.md

#### [MODIFY] [tasks.md](file:///c:/Users/PC/Desktop/HKVIII/Software%20design/Code/TKPMFinal/openspec/changes/build-unihub-workshop/tasks.md)

**Thay đổi 1 — Section 1: Setup (dòng 1-13):**
- Task 1.7: Tách thành 2:
  - **1.7a**: Provision Supabase project, lấy `DATABASE_URL`, tạo Storage buckets: `workshop-docs`, `student-imports`, `qr-codes`
  - **1.7b**: Chạy `npx prisma migrate dev` để tạo tất cả tables trên Supabase PostgreSQL
- Task 1.8: `Provision Upstash Redis` → **`Setup Redis via Docker Compose`**: tạo `docker-compose.yml` với `redis:7-alpine`, port 6379, AOF persistence
- Task 1.9: `.env` cập nhật:
  - Giữ: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (Supabase Storage SDK)
  - `REDIS_URL=redis://localhost:6379`
  - Bỏ: `MINIO_*`
  - Giữ: `RESEND_API_KEY`
  - Giữ tách biệt: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

**Thay đổi 2 — Section 3: Workshop Catalog (dòng 27-39):**
- Task 3.4: `transition DRAFT → PUBLISHED` → `transition DRAFT → OPEN`
- Task 3.9: `Enable Supabase Realtime on workshops table` → **`Implement SSE endpoint GET /workshops/:id/seats`** + Redis Pub/Sub publish khi seat count thay đổi

**Thay đổi 3 — Section 4: Registration (dòng 41-53):**
- Task 4.5: `hold_expires_at (+15 min)` → **`hold_expires_at (+10 min)`**
- Task 4.10: BullMQ delay → **`10 phút`**

**Thay đổi 4 — Section 6: Payment (dòng 66-78):**
- Task 6.7: Thêm circuit breaker condition: `>50% lỗi trong 30s (min 10 req)` + gateway timeout **5 giây**
- Task 6.10: `every 5 minutes` → **`every 15 minutes`**, stale threshold `> 30 minutes`

**Thay đổi 5 — Section 10 & 9: Storage references:**
- Task 10.2: `upload to Supabase Storage` — **giữ nguyên** ✅
- Task 9.2: `Supabase Storage student-csv bucket` — **giữ nguyên** ✅

---

## Docker Compose mới (chỉ còn 1 service)

```yaml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis_data:/data"]
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

---

## Verification Plan

### Manual Verification — Checklist sau khi sửa

- [ ] Không còn `Supabase Realtime` / `Postgres Changes` trong bất kỳ file nào
- [ ] Không còn `Upstash Redis` — thay bằng `Redis 7 Docker`
- [ ] Không còn `MinIO` — thay bằng `Supabase Storage`
- [ ] Không còn `Mailpit` / `SMTP` — thay bằng `Resend`
- [ ] Workshop status dùng `OPEN` (không phải `PUBLISHED`)
- [ ] Hold slot = **10 phút** (khớp config.yaml dòng 40)
- [ ] Payment reconcile = **15 phút**
- [ ] Circuit breaker có OR condition + 5s gateway timeout
- [ ] Docker Compose chỉ còn 1 service: `redis`
