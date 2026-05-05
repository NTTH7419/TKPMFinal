# Đặc tả: Notification Module

## Mô tả

Notification Module gửi thông báo xác nhận và thay đổi workshop qua in-app notification và email. Thiết kế dùng channel adapter để dễ thêm kênh mới như Telegram mà không sửa module nghiệp vụ.

## Mapping event → template → kênh

| Domain Event | Template | Kênh gửi | Trigger bởi |
| --- | --- | --- | --- |
| `RegistrationConfirmed` (miễn phí) | `registration_confirmed` | email, in-app | Registration Module |
| `PaymentSucceeded` | `registration_confirmed` | email, in-app | Payment Module |
| `RegistrationExpired` | `registration_expired` | in-app | Hold Expire Worker |
| `WorkshopCancelled` | `workshop_cancelled` | email, in-app | Organizer Admin |
| `WorkshopUpdated` (đổi phòng/giờ) | `workshop_updated` | email, in-app | Organizer Admin |
| `PaymentFailed` | `payment_failed` | in-app | Payment Module |

> Khi thêm kênh Telegram: bổ sung cột kênh vào bảng trên + thêm `TelegramAdapter` implement `NotificationChannelAdapter` interface. Không sửa logic nghiệp vụ.

## Luồng chính

1. Module nghiệp vụ phát domain event (ví dụ `RegistrationConfirmed`).
2. Backend ghi event vào `notification_events` (outbox pattern).
3. Notification worker đọc event, tra mapping để chọn template và danh sách kênh.
4. Worker tạo `notification_deliveries` cho từng kênh (mỗi kênh 1 record).
5. Channel adapter gửi qua email hoặc in-app.
6. Worker cập nhật `delivery.status` = `SENT` hoặc `FAILED`.

## Retry policy

| Attempt | Chờ trước retry |
| --- | --- |
| 1 | Ngay lập tức |
| 2 | 1 phút |
| 3 | 5 phút |
| 4 | 30 phút |
| 5 (final) | 2 giờ — nếu vẫn lỗi, delivery chuyển `FAILED_PERMANENT` |

Mỗi kênh retry độc lập. Email lỗi không ảnh hưởng in-app và ngược lại.

## Kịch bản lỗi

- Email provider lỗi: delivery chuyển `RETRYING`, worker retry theo backoff ở trên.
- Một kênh lỗi: kênh khác vẫn gửi được.
- Event bị xử lý lại: worker idempotent theo `(event_id, channel)` — unique constraint trên `notification_deliveries`.
- Template thiếu biến: delivery `FAILED`, ghi error reason, không retry.

## Ràng buộc

- Registration Module không gọi trực tiếp email provider.
- Mỗi kênh phải nằm sau interface `NotificationChannelAdapter`.
- Delivery status phải được lưu để audit.
- Gửi notification không được rollback registration.
- `notification_deliveries` unique theo `(event_id, channel)` để chống gửi trùng kênh.

## Tiêu chí chấp nhận

- Đăng ký thành công tạo in-app notification và email delivery.
- Email lỗi không làm registration thất bại.
- Thêm Telegram chỉ cần thêm adapter và cấu hình kênh — không sửa Registration Module.
- Cùng event không tạo quá 1 delivery per kênh.
- Worker retry tối đa 5 lần trước khi đánh dấu `FAILED_PERMANENT`.
