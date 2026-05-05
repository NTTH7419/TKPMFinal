# Đặc tả: Realtime số chỗ và bảo vệ tải

## Mô tả

Tính năng này cập nhật số chỗ còn lại theo thời gian thực bằng SSE/WebSocket và bảo vệ backend trước tải đột biến bằng virtual queue, rate limiting và idempotency.

## Luồng chính

### Realtime seat update

1. Student Web App mở kết nối SSE/WebSocket.
2. Khi registration/hold/expire làm thay đổi seat count, Backend API phát event nội bộ.
3. Redis Pub/Sub phân phối event đến các API instance.
4. API push `remaining_seats` mới đến client.
5. Client cập nhật UI.

### Virtual queue

1. Sinh viên vào màn hình đăng ký trong giờ cao điểm.
2. Frontend xin queue token từ Backend API.
3. Redis quản lý thứ tự/cửa sổ token (lưu `{user_id, workshop_id, issued_at, expires_at}`).
4. Backend chỉ nhận registration request có token hợp lệ (TTL = 120 giây).
5. Token hết hạn hoặc dùng sai user/workshop bị từ chối; token đã dùng bị xóa khỏi Redis ngay lập tức.

### Rate limit

**Thuật toán:** Token Bucket — Redis lưu `(tokens, last_refill_ts)` theo key; mỗi giây nạp lại `refill_rate` token, mỗi request tiêu 1 token.

| Endpoint tier | Key | Burst (capacity) | Refill rate | Hành vi vượt ngưỡng |
| --- | --- | --- | --- | --- |
| Công khai (xem lịch) | `ip` | 60 | 10/s | `429` + `Retry-After: 5s` |
| Đăng nhập | `ip` | 10 | 1/s | `429` + `Retry-After: 10s` |
| Đăng ký workshop | `user_id+workshop_id` | 5 | 1/30s | `429` + `Retry-After: 30s` |
| Admin thao tác | `user_id` | 30 | 5/s | `429` + `Retry-After: 5s` |

1. Mỗi request đi qua rate limit middleware.
2. Middleware đọc/ghi `(tokens, last_refill_ts)` từ Redis theo key tương ứng tier.
3. Nếu tokens > 0: giảm 1 token, cho qua. Nếu tokens = 0: trả `429` kèm `Retry-After`.

## Kịch bản lỗi

- SSE/WebSocket mất kết nối: client reconnect và fetch snapshot hiện tại.
- Redis pub/sub lỗi: API vẫn xử lý registration bằng DB; realtime bị degrade.
- Queue token hết hạn: sinh viên lấy token mới hoặc quay lại hàng đợi.
- Client spam đăng ký: bị rate limit.
- Client retry do timeout: idempotency trả kết quả cũ.

## Ràng buộc

- Realtime không phải source of truth cho số chỗ.
- Registration API luôn kiểm tra DB trong transaction.
- Queue token phải gắn với user/workshop.
- Rate limit phải áp dụng ở backend.
- Seat update phải idempotent và chấp nhận out-of-order bằng snapshot mới nhất.

## Tiêu chí chấp nhận

- Nhiều client nhận cập nhật số chỗ sau khi có registration mới.
- Client mất kết nối có thể reconnect.
- 12.000 sinh viên không được gửi thẳng toàn bộ request vào registration API.
- Client spam request nhận `429`.
- Retry cùng idempotency key không tạo registration mới.

