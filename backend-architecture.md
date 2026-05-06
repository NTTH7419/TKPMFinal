# UniHub Workshop – Kiến trúc Backend

## 1. Tổng quan kiến trúc

### Phong cách kiến trúc được chọn: Modular Monolith + Background Workers

Backend UniHub Workshop là một ứng dụng **NestJS** duy nhất, nhưng được tổ chức thành các module nghiệp vụ độc lập với boundary rõ ràng. Các tác vụ tốn thời gian hoặc dễ lỗi được tách sang **background workers** chạy qua BullMQ.

```
src/
├── auth/             # JWT, RBAC guard, session
├── workshop/         # CRUD workshop, SSE seat count
├── registration/     # Hold slot, QR generation
├── payment/          # Circuit breaker, idempotency, webhook
├── checkin/          # Preload roster, offline sync
├── notification/     # Channel adapter (email, push, Telegram stub)
├── student-import/   # CSV staging, validation, promotion
├── ai-summary/       # PDF parse, LLM call
├── queue/            # BullMQ setup, worker definitions
└── common/           # Rate limiter, virtual queue, response utils
```

### Lý do lựa chọn Modular Monolith

| Tiêu chí | Modular Monolith | Microservices |
|---|---|---|
| Độ phức tạp vận hành | Thấp – 1 process | Cao – nhiều service, service mesh |
| Tốc độ phát triển | Nhanh | Chậm hơn do overhead giao tiếp |
| Boundary nghiệp vụ | Rõ qua module | Rõ qua network |
| Khả năng mở rộng sau | Tách module thành service | Đã sẵn sàng |
| Phù hợp đội nhỏ / đồ án | ✅ Rất phù hợp | ❌ Quá phức tạp |

### Cách hệ thống phản ứng khi có sự cố

| Thành phần lỗi | Ảnh hưởng | Cơ chế bảo vệ |
|---|---|---|
| Payment gateway | Chỉ chặn đăng ký có phí | Circuit Breaker – graceful degradation |
| Email provider | Không gửi được email | Notification queue, retry theo kênh |
| AI provider | Summary không hiển thị | Job retry, trạng thái `SUMMARY_FAILED` |
| CSV file lỗi | Bị reject ở staging | Staging table, không chạm bảng `students` |
| Mạng tại check-in | Không đồng bộ được | PWA offline-first, IndexedDB event log |

---

## 2. Stack công nghệ

| Tầng | Công nghệ | Lý do |
|---|---|---|
| Runtime | Node.js 20 LTS | Hệ sinh thái phong phú, async I/O tốt |
| Framework | NestJS | Module system sẵn, Guard/Interceptor phù hợp Modular Monolith |
| ORM | Prisma | Schema-first, type-safe, migration dễ |
| Database chính | PostgreSQL 16 | Transaction ACID, row-level lock, unique constraint |
| Cache / Queue store | Redis 7 | Rate limit, virtual queue, BullMQ, pub/sub |
| Job queue | BullMQ | Chạy trên Redis, không cần broker riêng |
| Object storage | MinIO (local) / S3 (prod) | Lưu PDF, CSV, QR image |
| Auth | JWT (access 15m + refresh 7d) | Stateless, dễ tích hợp mobile/web |
| Realtime | SSE (Server-Sent Events) | Đơn giản hơn WebSocket, đủ dùng cho seat count |

---

## 3. Container diagram (C4 Level 2)

```
┌─────────────────────────────────────────────────────────┐
│                      Clients                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Student Web │  │  Admin Web   │  │  Check-in PWA │ │
│  │ React/Next.js│  │  Next.js SSR │  │ Offline-first │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘ │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │  HTTPS REST + SSE│                 │
          ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API – NestJS Modular Monolith       │
│                                                         │
│  [Auth] [Workshop] [Registration] [Payment] [Check-in]  │
│  [Notification] [AI Summary] [Student Import] [Realtime]│
│                                                         │
│              Background Workers (BullMQ)                │
│  [notification-worker] [ai-worker] [csv-worker]         │
│  [payment-reconcile-worker] [hold-expire-worker]        │
└────┬──────────────┬───────────────┬──────────┬──────────┘
     │              │               │          │
     ▼              ▼               ▼          ▼
┌─────────┐  ┌──────────┐  ┌────────────┐  ┌────────────┐
│Postgres │  │  Redis   │  │  MinIO /   │  │  External  │
│  (main) │  │(queue,   │  │  S3        │  │  Services  │
│         │  │ cache,   │  │(PDF,CSV,QR)│  │(Payment,   │
│         │  │ pub/sub) │  │            │  │Email, AI)  │
└─────────┘  └──────────┘  └────────────┘  └────────────┘
```

---

## 4. Luồng request tiêu biểu – Đăng ký workshop có phí

```
Client
  │
  │  POST /registrations
  │  Headers: Authorization: Bearer <jwt>
  │           Idempotency-Key: <uuid4>
  │           X-Queue-Token: <token>
  ▼
[JWT Guard]  →  xác thực token, lấy user_id + role
  │
[RBAC Guard]  →  kiểm tra role = STUDENT
  │
[Rate Limit Guard]  →  Token Bucket Redis
  │                    key: rl:{user_id}:register
  │                    5 tokens, refill 1/30s
  │
[Idempotency Interceptor]  →  tra DB theo Idempotency-Key
  │                            nếu tồn tại → trả kết quả cũ
  │
[Registration Service]
  │
  ├─ BEGIN TRANSACTION
  │    SELECT * FROM workshops WHERE id = ? FOR UPDATE
  │    Kiểm tra: status=OPEN, held+confirmed < capacity
  │    INSERT registration (status=PENDING_PAYMENT, hold_expires_at=now+10m)
  │    UPDATE workshops SET held_count = held_count + 1
  │  COMMIT
  │
  ├─ [Payment Adapter]
  │    [Circuit Breaker] → nếu OPEN → 503 "Thanh toán tạm gián đoạn"
  │    Nếu CLOSED → gọi gateway tạo payment intent (kèm idempotency key)
  │    Trả payment_url cho client
  │
  └─ Enqueue BullMQ jobs:
       - hold-expire (delay 10m): nếu chưa thanh toán → cancel registration
       
Client → redirect đến payment_url → thanh toán trên gateway

Gateway → POST /payment/webhook (signed)
  │
  ├─ Xác thực chữ ký webhook
  ├─ BEGIN TRANSACTION
  │    UPDATE payments SET status=SUCCEEDED
  │    UPDATE registrations SET status=CONFIRMED, qr_token=<hash>
  │    UPDATE workshops SET held_count-1, confirmed_count+1
  │  COMMIT
  │
  └─ Enqueue:
       - notification:send → email + in-app
       - qr:generate → tạo QR image lưu vào MinIO
```

---

## 5. Phân tầng dữ liệu

### 5.1 PostgreSQL – dữ liệu bền vững

Database chính cho toàn bộ dữ liệu nghiệp vụ. Lý do chọn PostgreSQL:
- Cần `SELECT FOR UPDATE` để chống oversell khi nhiều người đăng ký cùng lúc
- Unique constraint trên `idempotency_key`, `payment_intent_id`, `checkin_events.event_id`
- Transaction ACID cho luồng registration → payment → confirm
- Partial index hỗ trợ ràng buộc "1 sinh viên chỉ có 1 registration active/workshop"

### Schema các bảng chính

```sql
-- Người dùng và phân quyền
users           (id, email UK, password_hash, full_name, status, created_at)
roles           (id, code UK, name)               -- STUDENT, ORGANIZER, CHECKIN_STAFF, ADMIN
user_roles      (user_id FK, role_id FK, PRIMARY KEY (user_id, role_id))

-- Dữ liệu sinh viên (sync từ CSV)
students        (id, user_id FK, student_code UK, email, full_name, faculty,
                 status, source_batch_id FK, last_seen_in_import_at)

-- Workshop
workshops       (id, title, speaker_name, room_name, room_map_url,
                 capacity, confirmed_count, held_count,
                 fee_type, price, starts_at, ends_at,
                 status,           -- DRAFT | OPEN | CLOSED | CANCELLED
                 summary_status,   -- PENDING | PROCESSING | AI_GENERATED | ADMIN_EDITED | SUMMARY_FAILED
                 ai_summary)

-- Đăng ký
registrations   (id, workshop_id FK, student_id FK,
                 status,            -- PENDING_PAYMENT | CONFIRMED | EXPIRED | CANCELLED | NEEDS_REVIEW
                 hold_expires_at,
                 qr_token_hash,
                 idempotency_key UK,
                 created_at)

-- Thanh toán
payments        (id, registration_id FK, gateway,
                 payment_intent_id UK,
                 idempotency_key UK,
                 amount, status,   -- PENDING | SUCCEEDED | FAILED | REFUNDED
                 gateway_payload JSONB)

-- Check-in
checkin_events  (id, event_id UK,  -- UUID sinh bởi PWA, dùng để idempotent sync
                 registration_id FK, workshop_id FK, staff_user_id FK,
                 device_id, scanned_at, synced_at,
                 status)           -- ACCEPTED | DUPLICATE | INVALID

-- PDF và AI summary
workshop_documents (id, workshop_id FK, uploaded_by FK,
                    original_filename, file_path, file_size_bytes,
                    mime_type,        -- application/pdf
                    upload_status,    -- UPLOADED | PROCESSING | DONE | FAILED
                    created_at)

-- CSV import
student_import_batches (id, file_path, checksum UK, status,
                        total_rows, valid_rows, error_rows,
                        error_threshold_pct, started_at, completed_at,
                        created_at)

student_import_rows (id, batch_id FK, student_id FK,  -- link tới student đã upsert (nullable nếu lỗi)
                     row_number,
                     student_code, email, full_name, faculty,
                     row_status,    -- VALID | ERROR | DUPLICATE
                     error_message)

-- Notification
notification_events     (id, event_type, recipient_user_id FK, payload JSONB,
                         status, created_at)
notification_deliveries (id, event_id FK, channel, status, error_reason,
                         attempt_count, sent_at, created_at)
```

**Ràng buộc quan trọng:**
```sql
-- Không oversell
CONSTRAINT chk_capacity CHECK (confirmed_count + held_count <= capacity)

-- Mỗi sinh viên chỉ đăng ký một workshop active một lần
CREATE UNIQUE INDEX ON registrations (workshop_id, student_id)
  WHERE status NOT IN ('CANCELLED', 'EXPIRED');

-- Không gửi notification trùng kênh
CREATE UNIQUE INDEX ON notification_deliveries (event_id, channel);

-- Không import trùng file
UNIQUE (student_import_batches.checksum)
```

### 5.2 Redis – dữ liệu tạm, tốc độ cao

| Mục đích | Key pattern | TTL |
|---|---|---|
| Rate limit (Token Bucket) | `rl:{user_id}:{endpoint}` | 60s |
| Virtual queue token | `qt:{user_id}:{workshop_id}` | 120s |
| Circuit breaker state | `cb:payment_gateway` | Tự quản lý |
| BullMQ job queues | `bull:{queue_name}:*` | — |
| SSE pub/sub | `ws:{workshop_id}:seats` | — |

### 5.3 Object storage (MinIO / S3)

| Loại file | Bucket | Ghi chú |
|---|---|---|
| PDF workshop | `workshop-docs` | Upload bởi organizer, worker đọc để extract text |
| CSV sinh viên | `student-imports` | Hệ thống cũ ghi vào đây mỗi đêm |
| QR image | `qr-codes` | Worker sinh sau khi registration CONFIRMED |

---

## 6. Kiểm soát truy cập (RBAC)

### Các role và quyền

| Role | Quyền |
|---|---|
| `STUDENT` | Xem workshop, đăng ký, thanh toán, xem QR của chính mình |
| `ORGANIZER` | Tạo/sửa/hủy workshop, upload PDF, xem thống kê, quản lý import |
| `CHECKIN_STAFF` | Preload roster, sync check-in event qua PWA |
| `ADMIN` | Toàn quyền ORGANIZER + quản lý user/role/cấu hình |

### Enforcement tại API

Backend enforce quyền ở **middleware/guard cấp NestJS** — frontend chỉ ẩn/hiện UI, không phải lớp bảo mật.

```typescript
// Ví dụ guard
@Post('/registrations')
@Roles('STUDENT')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
async register(@Body() dto: CreateRegistrationDto) { ... }

@Post('/admin/workshops')
@Roles('ORGANIZER', 'ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
async createWorkshop(@Body() dto: CreateWorkshopDto) { ... }

@Post('/checkin/sync')
@Roles('CHECKIN_STAFF', 'ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
async syncCheckin(@Body() dto: SyncCheckinDto) { ... }

@Post('/payment/webhook')
// Không dùng role guard – xác thực bằng chữ ký gateway
@UseGuards(WebhookSignatureGuard)
async handleWebhook(@Body() payload: PaymentWebhookDto) { ... }
```

### Endpoint map

| Endpoint | Method | Role yêu cầu |
|---|---|---|
| `/workshops` | GET | Public |
| `/workshops/:id` | GET | Public |
| `/registrations` | POST | STUDENT |
| `/registrations/:id` | GET | STUDENT (chính mình) |
| `/admin/workshops` | POST/PUT/DELETE | ORGANIZER, ADMIN |
| `/admin/workshops/:id/documents` | POST | ORGANIZER, ADMIN |
| `/admin/stats` | GET | ORGANIZER, ADMIN |
| `/admin/imports` | GET/POST | ORGANIZER, ADMIN |
| `/admin/users` | GET/PUT | ADMIN |
| `/checkin/preload/:workshopId` | GET | CHECKIN_STAFF, ADMIN |
| `/checkin/sync` | POST | CHECKIN_STAFF, ADMIN |
| `/payment/webhook` | POST | (chữ ký gateway) |

---

## 7. Cơ chế bảo vệ hệ thống

### 7.1 Kiểm soát tải đột biến – Token Bucket + Virtual Queue

**Vấn đề:** 12.000 sinh viên truy cập trong 10 phút, 60% dồn vào 3 phút đầu. Endpoint đăng ký phải xử lý hàng nghìn request/giây mà không sụp.

**Giải pháp: Token Bucket (chọn thay vì Fixed Window hay Leaky Bucket)**

| Thuật toán | Burst? | Phân phối đều? | Chọn? |
|---|---|---|---|
| Fixed Window | Có (biên cửa sổ) | Không | ❌ Dễ bị spike 2x tại biên |
| Sliding Window | Không | Tốt | ✅ Tốt nhưng tốn RAM Redis hơn |
| Token Bucket | Có (giới hạn) | Tốt | ✅ **Được chọn** |
| Leaky Bucket | Không | Rất đều | ❌ Từ chối burst hợp lệ |

**Cấu hình theo endpoint tier:**

| Endpoint | Key | Capacity | Refill | Hành vi vượt ngưỡng |
|---|---|---|---|---|
| Xem lịch (public) | `ip` | 60 | 10/s | 429 + Retry-After: 5s |
| Đăng nhập | `ip` | 10 | 1/s | 429 + Retry-After: 10s |
| Đăng ký workshop | `user_id+workshop_id` | 5 | 1/30s | 429 + Retry-After: 30s |
| Admin thao tác | `user_id` | 30 | 5/s | 429 + Retry-After: 5s |
| Webhook payment | IP whitelist | Không giới hạn | — | Chỉ kiểm tra chữ ký |

**Virtual Queue:** Khi mở đăng ký, hệ thống phát token vào Redis Sorted Set. Client poll để lấy token, chỉ request có token hợp lệ mới được đi vào Registration Service. Token gắn `user_id + workshop_id + expires_at (120s)`, chỉ dùng được 1 lần.

```typescript
// Kiểm tra token bucket trong Redis (Lua script để atomic)
const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refill_rate = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  
  local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
  local tokens = tonumber(bucket[1]) or capacity
  local last_refill = tonumber(bucket[2]) or now
  
  local elapsed = now - last_refill
  tokens = math.min(capacity, tokens + elapsed * refill_rate)
  
  if tokens >= 1 then
    tokens = tokens - 1
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 60)
    return 1  -- allowed
  end
  return 0  -- rejected
`;
```

### 7.2 Xử lý cổng thanh toán không ổn định – Circuit Breaker

**Vấn đề:** Cổng thanh toán gặp sự cố → request treo → thread pool cạn → toàn bộ hệ thống chậm, kể cả xem lịch workshop.

**Giải pháp: Circuit Breaker 3 trạng thái + Graceful Degradation**

```
                  ≥5 lỗi / 30s
    ┌──────────────────────────────────────┐
    │                                      ▼
[CLOSED]                              [OPEN]
Gọi gateway bình thường               Từ chối ngay, không gọi gateway
    ▲                                      │
    │   3 probe thành công                 │ sau 30s
    │                                      ▼
    └───────────────────────────────[HALF-OPEN]
                                    Cho qua 3 request thử
```

**Cấu hình ngưỡng:**
- Failure threshold: 5 lỗi liên tiếp hoặc >50% lỗi trong cửa sổ 30s (tối thiểu 10 request)
- Timeout mỗi call gateway: 5 giây (tính là 1 lỗi nếu timeout)
- Open duration: 30 giây trước khi chuyển Half-Open
- Half-Open probe: 3 request – cả 3 thành công mới reset về Closed
- State lưu tại: `Redis key: cb:payment_gateway`

**Graceful Degradation khi circuit OPEN:**

| Chức năng | Hành vi |
|---|---|
| Xem lịch / danh sách workshop | ✅ Hoạt động bình thường |
| Đăng ký miễn phí | ✅ Hoạt động bình thường |
| Đăng ký có phí | ⚠️ HTTP 503 + thông báo rõ ràng cho người dùng |
| Admin quản lý workshop | ✅ Hoạt động bình thường |
| Webhook payment đến | ✅ Vẫn xử lý (inbound, không cần gọi gateway) |

```typescript
// Circuit breaker implementation đơn giản với Redis
async callWithCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  const state = await this.redis.get('cb:payment_gateway');
  
  if (state === 'OPEN') {
    const openSince = await this.redis.get('cb:payment_gateway:open_since');
    if (Date.now() - Number(openSince) < 30_000) {
      throw new ServiceUnavailableException('Thanh toán tạm gián đoạn, vui lòng thử lại sau');
    }
    // Chuyển sang HALF-OPEN
    await this.redis.set('cb:payment_gateway', 'HALF-OPEN');
  }
  
  try {
    const result = await Promise.race([fn(), this.timeout(5000)]);
    await this.onSuccess();
    return result;
  } catch (err) {
    await this.onFailure();
    throw err;
  }
}
```

### 7.3 Chống trừ tiền hai lần – Idempotency Key

**Vấn đề:** Client timeout sau khi bấm "Đăng ký" → retry → tạo 2 registration → trừ tiền 2 lần.

**Giải pháp: Idempotency Key ở cả registration lẫn payment**

**Luồng:**
1. Frontend sinh `uuid4` ngay khi người dùng bấm nút, gửi kèm header `Idempotency-Key`
2. Backend kiểm tra `registrations.idempotency_key` trước khi xử lý
3. Nếu key đã tồn tại → trả lại response đã lưu trước đó, không xử lý lại
4. Payment Module gửi `idempotency_key` sang gateway → gateway cũng dedup
5. Webhook handler dedup theo `payment_intent_id` (unique constraint)

**TTL và nơi lưu:**

| Key | Nơi lưu | TTL | Lý do |
|---|---|---|---|
| Registration idempotency | `registrations.idempotency_key` (DB) | 24h | Đủ cho client retry trong phiên |
| Payment idempotency | `payments.idempotency_key` (DB) | 30 ngày | Phục vụ reconcile và khiếu nại |
| Webhook event ID | `payments.payment_intent_id` (DB) | Vĩnh viễn | Webhook có thể đến nhiều ngày sau |
| Queue token | Redis TTL key | 120s | Dùng 1 lần rồi xóa |

---

## 8. Background Workers (BullMQ)

Tất cả workers chạy trong cùng process NestJS, consume từ Redis queue qua BullMQ.

| Queue | Job | Trigger | Xử lý |
|---|---|---|---|
| `notification` | `send` | Sau CONFIRM / sự kiện thay đổi | Gọi channel adapter (email/push/TG) |
| `ai-summary` | `process-pdf` | Sau khi organizer upload PDF | Extract text → gọi LLM → lưu summary |
| `csv-import` | `process-batch` | Scheduler detect file mới | Parse → staging → validate → promote |
| `payment` | `reconcile` | Cron mỗi 15 phút | Kiểm tra payment PENDING quá 30m |
| `hold-expire` | `expire` | Delay 10 phút sau tạo registration | Cancel PENDING_PAYMENT → giảm held_count |

**Retry policy:**
- Notification: 5 lần, exponential backoff (ngay → 1m → 5m → 30m → 2h → `FAILED_PERMANENT`)
- AI summary: 3 lần, exponential backoff (1m → 5m → 15m)
- CSV import: không retry tự động, admin trigger thủ công
- Hold expire: không retry (idempotent – kiểm tra status trước khi cancel)

---

## 9. Check-in offline

**Vấn đề:** Khu vực trong trường có mạng không ổn định. Staff vẫn phải check-in được.

**Giải pháp: PWA Offline-First + Idempotent Sync**

### Luồng chuẩn bị (có mạng)
1. Staff đăng nhập, chọn workshop cần check-in
2. PWA gọi `GET /checkin/preload/:workshopId`
3. Backend trả danh sách registration hợp lệ (CONFIRMED) + public key để verify QR
4. PWA lưu vào IndexedDB (roster + public key)

### Luồng scan offline
1. Staff quét QR → PWA decode QR token
2. PWA verify chữ ký bằng public key đã preload (không cần mạng)
3. Tra IndexedDB: kiểm tra registration hợp lệ và chưa check-in local
4. Ghi `checkin_event` vào IndexedDB với `event_id = uuid4()`, `status = PENDING_SYNC`
5. Hiển thị kết quả cho staff ngay lập tức

### Luồng đồng bộ (khi có mạng lại)
1. PWA gửi `POST /checkin/sync` với batch các event chưa sync
2. Backend upsert theo `event_id` (UNIQUE constraint) → idempotent
3. Backend trả kết quả từng event (ACCEPTED / DUPLICATE / INVALID)
4. PWA cập nhật IndexedDB theo kết quả

**Xử lý edge case:**
- PWA bị đóng khi offline → event vẫn trong IndexedDB, sync lại khi mở
- Hai thiết bị scan cùng QR offline → server nhận event đầu tiên = ACCEPTED, event sau = DUPLICATE
- QR hết hạn → verify chữ ký thất bại, reject ngay tại PWA không cần mạng

---

## 10. Đồng bộ dữ liệu sinh viên từ CSV

**Ràng buộc:** Hệ thống cũ không có API. CSV được export mỗi đêm vào object storage.

**Luồng xử lý:**

```
Hệ thống cũ
  │  export students.csv → MinIO/S3
  ▼
Scheduler (cron 2:00 AM)
  │  Phát hiện file mới qua checksum
  │  Nếu checksum đã tồn tại → bỏ qua
  ▼
student-import Worker
  │  Parse CSV → insert student_import_rows (staging)
  │  Validate: header hợp lệ, required fields, format
  │  Đếm lỗi: nếu error_rate > threshold (mặc định 20%) → REJECTED
  ▼
  │  Promotion (nếu valid)
  │  BEGIN TRANSACTION
  │    UPSERT students ON CONFLICT (student_code) DO UPDATE
  │    Cập nhật source_batch_id, last_seen_in_import_at
  │  COMMIT
  │  Batch → status = PROMOTED
  ▼
Admin xem báo cáo import (tổng dòng, lỗi, trùng)
```

**Không làm gián đoạn hệ thống đang chạy:**
- Import chạy trên background worker, không block API
- Staging table tách biệt với bảng `students` → lỗi file không ảnh hưởng production
- Transaction atomic khi promote → worker chết giữa chừng thì rollback, retry an toàn

---

## 11. Realtime – SSE Seat Count

**Vấn đề:** Sinh viên cần thấy số chỗ còn lại cập nhật gần thời gian thực khi nhiều người đăng ký cùng lúc.

**Giải pháp: SSE + Redis Pub/Sub**

1. Student Web App mở kết nối SSE tới `GET /workshops/:id/seats` (giữ kết nối mở).
2. Khi registration/hold/expire thay đổi seat count, Backend API publish event vào Redis channel `ws:{workshop_id}:seats`.
3. Redis Pub/Sub phân phối event đến tất cả API instance (nếu scale nhiều instance).
4. API push `{ remaining_seats, held_count, confirmed_count }` qua SSE đến client.
5. Client cập nhật UI ngay lập tức.

**Xử lý edge case:**
- SSE mất kết nối: client tự reconnect (EventSource tự động retry) và fetch snapshot hiện tại.
- Redis pub/sub lỗi: API vẫn xử lý registration bằng DB; realtime bị degrade nhưng không ảnh hưởng logic.
- Số chỗ hiển thị realtime **không phải source of truth** — DB transaction mới quyết định cuối cùng.

```typescript
// SSE endpoint
@Sse('workshops/:id/seats')
seatUpdates(@Param('id') workshopId: string): Observable<MessageEvent> {
  return this.workshopService.getSeatStream(workshopId);
}
```

---

## 12. Notification – Channel Adapter Pattern

**Yêu cầu:** Dễ thêm kênh mới (Telegram) mà không sửa Registration Module.

**Event mapping:**

| Domain Event | Template | Kênh | Trigger |
|---|---|---|---|
| `RegistrationConfirmed` (miễn phí) | `registration_confirmed` | email, in-app | Registration Module |
| `PaymentSucceeded` | `registration_confirmed` | email, in-app | Payment Module |
| `RegistrationExpired` | `registration_expired` | in-app | Hold Expire Worker |
| `WorkshopCancelled` | `workshop_cancelled` | email, in-app | Organizer Admin |
| `WorkshopUpdated` (đổi phòng/giờ) | `workshop_updated` | email, in-app | Organizer Admin |
| `PaymentFailed` | `payment_failed` | in-app | Payment Module |

**Thiết kế: Outbox Pattern + Channel Adapter**

```typescript
// 1. Module nghiệp vụ ghi event vào DB (outbox)
class RegistrationService {
  async confirmRegistration(reg: Registration) {
    // ... business logic ...
    await this.notificationEventRepo.create({
      event_type: 'RegistrationConfirmed',
      recipient_user_id: reg.student.user_id,
      payload: { workshop_title, qr_url },
    });
  }
}

// 2. Worker consume từ DB outbox → enqueue per-channel jobs
class NotificationWorker {
  async processEvent(event: NotificationEvent) {
    const channels = this.getChannelsForEvent(event.event_type);
    for (const channel of channels) {
      await this.deliveryRepo.create({ event_id: event.id, channel, status: 'PENDING' });
      await this.queue.add('send', { delivery_id, channel });
    }
  }
}

// 3. Channel Adapter interface
interface NotificationChannelAdapter {
  send(recipient: string, payload: NotificationPayload): Promise<void>;
}

class EmailChannel implements NotificationChannelAdapter { ... }
class InAppChannel implements NotificationChannelAdapter { ... }
class TelegramChannel implements NotificationChannelAdapter { ... }  // thêm sau
```

Để thêm Telegram: tạo `TelegramChannel` implement interface + thêm cột kênh vào mapping table. Không cần sửa Registration, Payment hay bất kỳ module nghiệp vụ nào.

---

## 13. AI Summary – PDF Processing

**Vấn đề:** Ban tổ chức upload PDF giới thiệu workshop, hệ thống cần tự động tóm tắt.

**Ràng buộc kỹ thuật:**

| Tham số | Giá trị |
|---|---|
| PDF tối đa | 20 MB |
| Định dạng | `application/pdf` only |
| Chunk size | ≤ 3.000 token/chunk |
| AI call timeout | 30 giây/call |
| Max retry | 3 lần (backoff: 1m → 5m → 15m) |
| Min output length | 100 ký tự |

**Luồng:**

```
Organizer upload PDF (≤ 20 MB)
  │  Backend validate mime_type + size → nếu > 20 MB → 413
  │  Lưu vào MinIO bucket workshop-docs
  │  Tạo workshop_document (upload_status = UPLOADED)
  │  Enqueue BullMQ job: ai-summary:process-pdf
  │  Trả 201 ngay (không chờ AI)
  ▼
AI Summary Worker
  │  Extract text (pdfplumber / Apache PDFBox)
  │  Clean text (loại header/footer lặp, whitespace thừa)
  │  Chunk ≤ 3.000 token → gọi LLM từng chunk → ghép output
  │  Validate: output ≥ 100 ký tự, không bị truncated
  │  Lưu ai_summary, summary_status = AI_GENERATED
  ▼
Student Web hiển thị summary
Admin có thể sửa → summary_status = ADMIN_EDITED
```

**Xử lý lỗi:**
- PDF corrupted/encrypted → `SUMMARY_FAILED` + error reason
- AI timeout 3 lần → `SUMMARY_FAILED`, admin thấy trạng thái lỗi
- Upload PDF mới khi đang xử lý → hủy job cũ, tạo job mới

---

## 14. Các quyết định kiến trúc quan trọng (ADR)

### ADR-001: Modular Monolith thay vì Microservices
**Quyết định:** Monolith  
**Lý do:** Đội nhỏ, bối cảnh đồ án, cần giảm overhead vận hành  
**Đánh đổi:** Khó scale từng module độc lập; có thể tách sau khi boundary đã rõ

### ADR-002: PostgreSQL làm database chính
**Quyết định:** PostgreSQL (không dùng NoSQL)  
**Lý do:** Registration và payment cần transaction, unique constraint, row-level lock  
**Đánh đổi:** Khó scale ngang hơn NoSQL; với 12.000 user/sự kiện, PostgreSQL hoàn toàn đủ

### ADR-003: Row Lock + Hold Slot cho đăng ký
**Quyết định:** `SELECT FOR UPDATE` + `held_count`  
**Lý do:** Đảm bảo không oversell. Hold cho phép workshop có phí chờ thanh toán  
**Đánh đổi:** Workshop hot sẽ serialize trên row lock; chấp nhận được vì capacity nhỏ và transaction ngắn

### ADR-004: BullMQ thay vì RabbitMQ riêng
**Quyết định:** BullMQ (chạy trên Redis)  
**Lý do:** Không cần setup broker riêng; đủ tính năng retry, delay, priority cho bài toán này  
**Đánh đổi:** Không có message durability mạnh như RabbitMQ; Redis AOF đủ bảo vệ

### ADR-005: Async Payment + Webhook
**Quyết định:** Tạo payment intent → redirect → nhận webhook  
**Lý do:** Tránh request treo, xử lý đúng timeout phía client  
**Đánh đổi:** Nhiều trạng thái hơn (PENDING_PAYMENT, hold, expire), cần reconcile job

### ADR-006: SSE thay vì WebSocket cho seat count
**Quyết định:** Server-Sent Events  
**Lý do:** Đơn giản hơn WebSocket, đủ dùng cho push một chiều (server → client)  
**Đánh đổi:** Không có bidirectional communication; không cần thiết cho bài toán này

### ADR-007: JWT access (15m) + refresh token (7d)
**Quyết định:** Stateless JWT  
**Lý do:** Không cần session store, dễ scale, phù hợp web và PWA  
**Đánh đổi:** Không revoke được access token trước khi hết hạn; mitigated bằng TTL ngắn (15m)

### ADR-008: PWA thay vì Native App cho check-in
**Quyết định:** Progressive Web App  
**Lý do:** Staff dễ truy cập (không cần cài app store), triển khai nhanh  
**Đánh đổi:** Phụ thuộc browser và storage limit; cần preload và IndexedDB đủ dữ liệu

---

## 15. Hướng dẫn khởi chạy

### Yêu cầu
- Node.js 20+
- Docker + Docker Compose

### Khởi động

```bash
# Clone và cài dependencies
git clone <repo>
cd unihub-workshop
npm install

# Chạy infrastructure
docker-compose up -d postgres redis minio mailpit

# Setup database
npx prisma migrate dev
npx prisma db seed

# Chạy backend
npm run start:dev

# Chạy workers (cùng process, chỉ cần start:dev là đủ)
```

### docker-compose.yml tối giản

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: unihub
      POSTGRES_USER: unihub
      POSTGRES_PASSWORD: password
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes: ["minio_data:/data"]

  mailpit:
    image: axllent/mailpit
    ports: ["1025:1025", "8025:8025"]
    # SMTP trên port 1025, Web UI trên port 8025

volumes:
  postgres_data:
  minio_data:
```

### Biến môi trường (.env)

```env
DATABASE_URL=postgresql://unihub:password@localhost:5432/unihub
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
JWT_SECRET=<secret-dài-ít-nhất-32-ký-tự>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
PAYMENT_GATEWAY_URL=https://sandbox.payment-gateway.vn
PAYMENT_WEBHOOK_SECRET=<gateway-cung-cap>
OPENAI_API_KEY=<optional-cho-ai-summary>
SMTP_HOST=localhost
SMTP_PORT=1025
MAILPIT_UI=http://localhost:8025
```
