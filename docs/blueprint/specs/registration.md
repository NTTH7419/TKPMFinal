# Đặc tả: Đăng ký workshop và giữ chỗ

## Mô tả

Tính năng registration cho phép sinh viên đăng ký workshop miễn phí hoặc có phí. Hệ thống phải chống oversell khi nhiều sinh viên cùng đăng ký, đồng thời hỗ trợ hold slot tạm thời cho luồng thanh toán.

## Luồng chính

1. Sinh viên bấm "Đăng ký" trên Student Web App.
2. Frontend gửi request kèm queue token và `Idempotency-Key`.
3. Backend kiểm tra authentication, role `STUDENT`, rate limit và queue token.
4. Registration Module mở database transaction.
5. Backend khóa dòng workshop bằng row lock.
6. Backend kiểm tra workshop còn published, còn thời gian đăng ký và còn chỗ.
7. Backend tạo registration:
   - Workshop miễn phí: `CONFIRMED`.
   - Workshop có phí: `PENDING_PAYMENT` với `hold_expires_at`.
8. Backend cập nhật `confirmed_count` hoặc `held_count`.
9. Transaction commit.
10. Backend phát event cập nhật số chỗ và event notification phù hợp.

## Kịch bản lỗi

- Hết chỗ: trả `WORKSHOP_FULL`, không tạo registration.
- Workshop bị hủy: trả `WORKSHOP_CANCELLED`.
- Queue token hết hạn: trả `QUEUE_TOKEN_EXPIRED`.
- Sinh viên retry cùng idempotency key: trả lại registration đã tạo.
- Worker expire hold chạy khi quá hạn thanh toán: registration chuyển `EXPIRED`, giảm `held_count`.

## Ràng buộc

- Không gửi email, gọi payment gateway hoặc xử lý QR nặng trong transaction giữ lock.
- Transaction giữ lock phải ngắn.
- Một sinh viên chỉ có một registration active cho một workshop.
- `confirmed_count + held_count` không được vượt `capacity`.
- Số chỗ hiển thị realtime không phải source of truth; DB transaction mới quyết định cuối cùng.

## Tiêu chí chấp nhận

- Khi 100 request đồng thời tranh 1 chỗ cuối, chỉ 1 request được confirmed/held.
- Retry request không tạo thêm registration.
- Hold quá hạn được trả chỗ tự động.
- Workshop miễn phí confirmed ngay và sinh QR.
- Workshop có phí chuyển đúng sang payment flow.

