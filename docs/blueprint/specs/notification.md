# Đặc tả: Notification Module

## Mô tả

Notification Module gửi thông báo xác nhận và thay đổi workshop qua in-app notification và email. Thiết kế dùng channel adapter để dễ thêm kênh mới như Telegram.

## Luồng chính

1. Module nghiệp vụ phát domain event, ví dụ `RegistrationConfirmed` hoặc `WorkshopCancelled`.
2. Backend ghi event vào notification/outbox.
3. Notification worker đọc event.
4. Worker chọn template và danh sách kênh cần gửi.
5. Worker tạo `notification_deliveries` cho từng kênh.
6. Channel adapter gửi qua email hoặc in-app.
7. Worker cập nhật trạng thái delivery.

## Kịch bản lỗi

- Email provider lỗi: delivery chuyển `RETRYING`, worker retry theo backoff.
- Một kênh lỗi: kênh khác vẫn gửi được.
- Event bị xử lý lại: worker idempotent theo event ID và channel.
- Template thiếu biến: delivery failed và ghi error reason.

## Ràng buộc

- Registration Module không gọi trực tiếp email provider.
- Mỗi kênh phải nằm sau interface adapter.
- Delivery status phải được lưu để audit.
- Gửi notification không được rollback registration.

## Tiêu chí chấp nhận

- Đăng ký thành công tạo in-app notification và email delivery.
- Email lỗi không làm registration thất bại.
- Thêm Telegram chỉ cần thêm adapter và cấu hình kênh.
- Delivery trùng không gửi lặp nhiều lần ngoài ý muốn.

