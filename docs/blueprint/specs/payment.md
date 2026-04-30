# Đặc tả: Thanh toán workshop có phí

## Mô tả

Tính năng payment xử lý workshop có phí bằng payment intent bất đồng bộ và webhook. Hệ thống cần tránh trừ tiền hai lần, xử lý timeout, và cô lập lỗi cổng thanh toán.

## Luồng chính

1. Registration Module tạo registration `PENDING_PAYMENT` và hold slot.
2. Payment Module tạo payment record trạng thái `INITIATED`.
3. Payment Adapter gọi gateway tạo payment intent với idempotency key.
4. Gateway trả payment URL/intent ID.
5. Sinh viên hoàn tất thanh toán ở gateway.
6. Gateway gửi signed webhook về Backend API.
7. Backend xác thực chữ ký webhook.
8. Payment Module cập nhật payment `SUCCEEDED`.
9. Registration Module chuyển registration sang `CONFIRMED`, giảm `held_count`, tăng `confirmed_count`, sinh QR.
10. Notification Module gửi xác nhận qua in-app và email.

## Kịch bản lỗi

- Gateway timeout khi tạo intent: giữ registration pending trong thời hạn hold, worker có thể retry/reconcile.
- Client timeout sau khi thanh toán: webhook vẫn cập nhật kết quả, sinh viên không cần thanh toán lại.
- Webhook gửi trùng: handler trả 200 và không cập nhật trùng.
- Payment failed: registration chuyển `FAILED` hoặc chờ retry tùy chính sách; slot được release nếu không còn thanh toán.
- Webhook thành công sau khi hold expired: chuyển `NEEDS_REVIEW` hoặc hoàn tiền theo chính sách.
- Gateway lỗi liên tục: circuit breaker chuyển Open, không gọi gateway mới.

## Ràng buộc

- Mỗi registration có payment idempotency key duy nhất cho mỗi attempt.
- `payment_intent_id` là unique.
- Webhook phải xác thực chữ ký.
- Không xác nhận registration chỉ dựa vào kết quả client redirect.
- Circuit breaker phải có trạng thái Closed, Open, Half-Open.

## Tiêu chí chấp nhận

- Client bấm thanh toán nhiều lần không tạo nhiều giao dịch cho cùng registration.
- Webhook trùng không làm tăng/giảm seat count nhiều lần.
- Khi gateway down, xem lịch và đăng ký workshop miễn phí vẫn hoạt động.
- Registration pending quá hạn được expire và trả chỗ.
- Payment thành công tạo QR và notification.

