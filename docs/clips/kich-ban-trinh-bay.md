# Kịch bản trình bày — UniHub Workshop

## Phân công 3 thành viên

| Thành viên | Chủ đề |
|---|---|
| **Toàn** | Chống oversell (Row Lock + Hold Slot) · Virtual Queue + Token Bucket (Lua Script) · Circuit Breaker |
| **Thái** | Auth/RBAC + JWT Rotation · Payment Async + Webhook · Notification Outbox |
| **Tuấn** | Check-in PWA Offline + Idempotent Sync · AI Summary Pipeline · Student Import CSV |

---

# CLIP 1 — Toàn
## Chủ đề: Chống oversell, Virtual Queue, Token Bucket, Circuit Breaker
## Thời lượng ước tính: ~12–15 phút

---

### Phần 1A — Chống oversell: Row Lock + Hold Slot (~4 phút)

**[Camera bật, mở file `apps/api/src/registration/registration.service.ts`]**

> "Vấn đề chúng tôi phải giải quyết là: khi 12.000 sinh viên cùng bấm đăng ký một workshop còn đúng 1 chỗ, làm sao đảm bảo chỉ có đúng 1 người thành công — không hơn, không kém."

**Demo trên code — chỉ vào dòng 51–79:**

> "Giải pháp là `SELECT FOR UPDATE`. Đây không phải lock cả bảng — đây là **row-level lock** chính xác trên dòng workshop đó. Khi transaction A đang giữ lock, transaction B phải chờ. Không có race condition."

```sql
-- dòng 64–67 trong code thực tế
SELECT id, status, capacity, confirmed_count, held_count, fee_type, price, ends_at
FROM workshops
WHERE id = $1
FOR UPDATE
```

> "Sau khi có lock, hệ thống kiểm tra `confirmed_count + held_count >= capacity`. Nếu đủ rồi thì từ chối ngay — không tạo registration."

**Chỉ vào dòng 76–79:**
> "Tiếp theo, check xem sinh viên này đã có đăng ký active chưa — tránh 1 người đăng ký 2 lần do double-click."

**Chỉ vào dòng 96–121 (FREE workshop):**
> "Nếu workshop miễn phí — tạo `CONFIRMED` ngay trong transaction, tăng `confirmedCount` trong cùng transaction đó. Lock giải phóng khi COMMIT."

**Chỉ vào dòng 134–166 (PAID workshop):**
> "Nếu có phí — trạng thái là `PENDING_PAYMENT`, tăng `heldCount`, đặt `holdExpiresAt = now + 10 phút`. Slot bị giữ 10 phút để sinh viên thanh toán. Hết 10 phút mà chưa trả — worker `expire-hold` tự động nhả slot về."

> "Toàn bộ logic này trong một transaction duy nhất. Transaction giữ lock **dưới 50ms** — không gọi email, không gọi payment trong lock. Đây là điểm then chốt."

---

### Phần 1B — Idempotency Key (~1 phút)

**Chỉ vào dòng 34–37:**

> "Trước khi làm gì, hệ thống check `idempotency_key`. Đây là UUID client tự sinh khi bấm Đăng ký. Nếu key này đã tồn tại trong DB — trả kết quả cũ ngay, không tạo registration mới. Cơ chế này chặn double-click và network retry."

---

### Phần 2 — Virtual Queue + Token Bucket Lua Script (~5 phút)

**[Mở `apps/api/src/load-protection/queue-token.service.ts` và `token-bucket.service.ts`]**

> "Chống oversell xử lý tính đúng đắn. Nhưng nếu 12.000 request đổ vào DB cùng lúc, dù đúng thì DB vẫn chết. Chúng tôi cần thêm hai lớp bảo vệ phía trước."

**Demo `queue-token.service.ts`:**

> "Lớp 1: **Virtual Queue**. Trước khi gọi `POST /registrations`, client phải xin một queue token qua `POST /workshops/:id/queue-token`. Token này được lưu trong Redis với TTL 120 giây, key là `qt:{userId}:{workshopId}`."

**Chỉ vào dòng 44–52 (`consumeToken`):**
> "Khi registration request đến, hệ thống gọi `redis.del(tokenKey)`. Nếu trả về 0 — token không tồn tại hoặc đã dùng rồi — từ chối ngay. `DEL` là atomic, không thể hai request cùng consume một token."

**Mở `token-bucket.service.ts`, chỉ vào Lua script dòng 13–53:**

> "Lớp 2: **Token Bucket**. Đây là rate limiting theo thuật toán token bucket — khác với fixed window ở chỗ nó cho phép burst nhỏ hợp lệ khi mới mở đăng ký."

> "Quan trọng: toàn bộ logic này là một **Lua script chạy atomic trên Redis**. Tại sao? Vì nếu dùng nhiều lệnh Redis riêng lẻ, có thể có race condition giữa read và write. Lua script trên Redis được thực thi như một transaction — không có gì chen vào giữa."

**Giải thích Lua script theo từng bước:**
1. `HMGET` — đọc `(tokens, last_refill)` từ Redis hash
2. Tính `elapsed` và `refilled` — nạp lại token theo thời gian
3. `tokens >= 1` → cho qua, giảm 1 token
4. `tokens < 1` → từ chối, tính `retryAfter`
5. `HMSET` + `EXPIRE` — ghi lại trạng thái

> "Kết quả: endpoint đăng ký workshop có `burst = 5, refill = 1/30s` per `userId+workshopId`. Vượt ngưỡng trả `429 Too Many Requests` kèm `Retry-After: 30s`."

---

### Phần 3 — Circuit Breaker (~4 phút)

**[Mở `apps/api/src/payment/circuit-breaker.service.ts`]**

> "Vấn đề cuối: Payment gateway có thể down. Nếu không cô lập, mỗi request đăng ký có phí sẽ treo chờ gateway timeout, làm thread pool cạn kiệt, kéo sập cả API."

> "Giải pháp: Circuit Breaker Pattern — cơ chế tự ngắt mạch như cầu dao điện."

**Chỉ vào interface `CircuitState` (dòng 6–11):**
> "Trạng thái được lưu trong Redis key `cb:payment_gateway` — 3 trạng thái: CLOSED, OPEN, HALF_OPEN."

**State machine:**

```
CLOSED ──(≥5 lỗi liên tiếp hoặc >50% failure rate)──► OPEN
  ▲                                                        │
  │                                                    (30s timeout)
  │                                                        ▼
  └──────(3 probe requests đều thành công)──────── HALF_OPEN
         (bất kỳ probe nào lỗi → quay lại OPEN)
```

**Chỉ vào `canProceed()` (dòng 30–54):**
> "Khi OPEN — throw `503 Service Unavailable` ngay, không gọi gateway. Khi OPEN timeout 30s — chuyển HALF_OPEN tự động."

**Chỉ vào cấu hình (dòng 22–27):**
> "5 lỗi liên tiếp, hoặc >50% failure rate trong 10 request trở lên — circuit open. Tất cả config này trong code, dễ điều chỉnh."

> "Kết quả: khi gateway down, xem lịch và đăng ký miễn phí vẫn chạy bình thường. Chỉ đăng ký có phí nhận `503`. Khi gateway recover, hệ thống tự phục hồi sau 30 giây."

---

---

# CLIP 2 — THÀNH VIÊN 2
## Chủ đề: Auth/RBAC + JWT Rotation · Payment Async · Notification Outbox
## Thời lượng ước tính: ~10–12 phút

---

### Phần 1 — Auth/RBAC + JWT Rotation (~4 phút)

**[Mở `apps/api/src/auth/`]**

> "Hệ thống dùng JWT hai lớp. Access token TTL 15 phút — lưu trong memory client, gửi qua `Authorization: Bearer`. Refresh token TTL 7 ngày — lưu trong `HTTP-only cookie`, không thể đọc qua JavaScript."

> "Vấn đề: nếu refresh token bị đánh cắp, attacker dùng mãi được 7 ngày. Giải pháp: **Refresh Token Rotation**."

**Demo luồng rotation:**
1. Client gọi `POST /auth/refresh` với refresh token cũ
2. Backend xác thực → phát cặp token mới
3. Token cũ bị revoke: lưu `jti` (JWT ID) vào Redis blocklist với TTL = thời gian còn lại của token cũ
4. Nếu attacker dùng token cũ → check Redis → tìm thấy trong blocklist → từ chối

**Demo `RolesGuard`:**
> "RBAC enforce 100% ở backend. Guard đọc `roles[]` từ JWT payload — không tin bất kỳ input nào từ client. Frontend chỉ ẩn/hiện UI, không phải ranh giới bảo mật."

| Role | Quyền |
|---|---|
| `STUDENT` | Xem workshop, đăng ký, thanh toán, xem QR của chính mình |
| `ORGANIZER` | Quản lý workshop, upload PDF, xem thống kê, quản lý import |
| `CHECKIN_STAFF` | Preload roster, quét QR, sync check-in |
| `ADMIN` | Quản lý user/role/cấu hình, có quyền organizer |

---

### Phần 2 — Payment Async + Webhook (~4 phút)

**[Mở `apps/api/src/payment/payment.service.ts` và `mock-payment.adapter.ts`]**

> "Payment không được xử lý đồng bộ. Lý do: gateway có thể timeout 5–10 giây, user mất kết nối, hoặc bấm lại nhiều lần."

**Demo luồng:**
1. Client gọi `POST /payments/:registrationId/intent`
2. Backend tạo payment intent với `idempotency_key` duy nhất → lưu `payment_intent_id` vào DB
3. Trả `payment_url` cho client → client redirect sang gateway
4. Gateway gọi webhook `POST /payments/webhook` với HMAC-SHA256 signature
5. Backend xác thực chữ ký → cập nhật `payment SUCCEEDED` → `registration CONFIRMED` → sinh QR

> "Hai idempotency key bảo vệ tại 2 điểm: `payments.idempotency_key` ngăn tạo nhiều intent. `payments.payment_intent_id` ngăn webhook trùng làm 2 lần SUCCEEDED."

---

### Phần 3 — Notification Outbox + Channel Adapter (~3 phút)

**[Mở `apps/api/src/notification/`]**

> "Registration module không gọi email trực tiếp. Nó emit một Domain Event — `RegistrationConfirmed`. Notification module lắng nghe event này, ghi vào bảng `notification_events` (outbox), rồi worker xử lý gửi độc lập."

**Chỉ vào schema `notification_deliveries`:**
> "Mỗi channel có một delivery record riêng — EMAIL, IN_APP, TELEGRAM. Nếu email lỗi, chỉ retry channel email, không ảnh hưởng in-app. Registration không rollback vì email chưa gửi được."

> "Channel adapter pattern: thêm kênh mới như Telegram chỉ cần implement interface `NotificationChannel` — không sửa business logic."

---

---

# CLIP 3 — THÀNH VIÊN 3
## Chủ đề: Check-in PWA Offline · AI Summary Pipeline · Student Import CSV
## Thời lượng ước tính: ~10–12 phút

---

### Phần 1 — Check-in PWA Offline-first (~4 phút)

**[Mở `apps/checkin-pwa/src/db.ts` và `apps/checkin-pwa/src/pages/ScanPage.tsx`]**

> "Nhân sự check-in làm việc trong hội trường — mạng có thể yếu hoặc mất. Nếu app phụ thuộc mạng thì không check-in được. Chúng tôi xây PWA offline-first."

**Demo luồng:**
1. Staff mở app, chọn workshop → `POST /checkin/preload` → nhận roster + HMAC secret → lưu vào **IndexedDB**
2. Mạng mất — staff vẫn quét QR. App verify QR bằng HMAC secret trong IndexedDB — không cần gọi server
3. Event `ACCEPTED` lưu vào IndexedDB event log với UUID riêng
4. Khi có mạng → `POST /checkin/sync` batch gửi lên server

**[Mở `apps/api/src/checkin/checkin.service.ts` dòng 39–45]:**
> "Server xử lý sync bằng `findUnique({where: {eventId}})`. Nếu eventId đã có — trả kết quả cũ ngay, không insert lại. Đây là idempotency cho offline sync — 2 thiết bị quét cùng 1 QR offline, khi sync server chỉ ACCEPTED cái quét sớm nhất."

**[Chỉ vào dòng 70–86 — timestamp-based conflict resolution]:**
> "Nếu đã có ACCEPTED rồi mà event mới đến với `scannedAt` sớm hơn — demote cái cũ xuống DUPLICATE, promote cái mới lên ACCEPTED. Server luôn giữ cái scan sớm nhất."

---

### Phần 2 — AI Summary Pipeline (~4 phút)

**[Mở `apps/api/src/ai-summary/ai-summary.processor.ts`]**

> "Organizer upload PDF → hệ thống tự động tóm tắt bằng AI. Nhưng upload không chờ AI xong — upload trả về ngay, AI xử lý async qua BullMQ queue."

**Demo pipe-and-filter (5 filter):**

| Filter | Dòng code | Mô tả |
|---|---|---|
| Filter 1 | dòng 56 | Download PDF từ Supabase Storage → `pdf-parse` → raw text |
| Filter 2 | dòng 144–165 | Clean text — loại bỏ header/footer lặp, collapse whitespace, giữ Unicode tiếng Việt |
| Filter 3 | dòng 168–175 | Chunk text theo `3000 tokens × 4 chars = 12.000 chars/chunk` |
| Filter 4 | dòng 179–205 | Gọi Gemini API với timeout 30s, mỗi chunk 1 lần call |
| Filter 5 | dòng 209–214 | Validate output — summary phải dài hơn threshold tối thiểu |

**Chỉ vào retry backoff (dòng 16–19):**
> "Nếu AI timeout hoặc lỗi: BullMQ retry tối đa 3 lần với backoff 1 phút → 5 phút → 15 phút. Sau 3 lần — `@OnWorkerEvent('failed')` set `summaryStatus = SUMMARY_FAILED`. Workshop vẫn hiển thị bình thường, chỉ không có AI summary."

---

### Phần 3 — Student Import CSV Staging (~3 phút)

**[Mở `apps/api/src/student-import/student-import.processor.ts`]**

> "Dữ liệu sinh viên đến từ file CSV export ban đêm của hệ thống cũ. Không được import thẳng vào bảng `students` — nếu file lỗi hoặc worker crash giữa chừng thì bảng bị corrupt."

**Demo staging pattern:**

```
CSV upload
    │
    ▼
SHA256 checksum ──(đã tồn tại)──► bỏ qua, không import lại
    │
    ▼
Parse rows → student_import_rows (staging)
    │
    ▼
Validate (header, required fields, duplicates trong batch)
    │
    ├──(lỗi vượt ngưỡng)──► Batch REJECTED, bảng students KHÔNG đổi
    │
    └──(hợp lệ)──► Atomic promotion transaction
                        │
                        ▼
                   UPSERT vào students
                        │
                   COMMIT → Batch PROMOTED
                   (crash giữa chừng → ROLLBACK toàn bộ)
```

> "Trong khi import chạy, sinh viên vẫn đăng ký workshop bình thường — hai quy trình hoàn toàn độc lập."

---

---

## Ghi chú chuẩn bị chung

### Trước khi quay

```bash
# Khởi động Redis
docker-compose up -d

# Khởi động
pnpm run dev
```

### Demo Redis CLI trực tiếp (Clip 1)

```bash
# Xem queue token sau khi issue
redis-cli KEYS "qt:*"

# Xem trạng thái circuit breaker
redis-cli GET "cb:payment_gateway"

# Xem token bucket state
redis-cli HGETALL "rl:register:*"
```

### Demo IndexedDB (Clip 3)

Mở DevTools → Application → IndexedDB → chọn database checkin-pwa → xem roster và event log khi offline.

### Thứ tự quay gợi ý

Clip 1 → Clip 2 → Clip 3, mỗi clip độc lập nhau.
