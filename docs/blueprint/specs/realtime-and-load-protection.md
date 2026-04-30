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
2. Frontend xin queue token.
3. Redis quản lý thứ tự/cửa sổ token.
4. Backend chỉ nhận registration request có token hợp lệ.
5. Token hết hạn hoặc dùng sai user/workshop bị từ chối.

### Rate limit

1. Mỗi request đi qua rate limit middleware.
2. Redis lưu token bucket/counter theo user/IP/endpoint.
3. Nếu vượt ngưỡng, API trả `429` và `Retry-After`.

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

