# Đặc tả: Auth và RBAC

## Mô tả

Tính năng Auth/RBAC quản lý đăng nhập, phiên làm việc và phân quyền cho bốn nhóm: sinh viên, ban tổ chức, nhân sự check-in và admin. Hệ thống dùng RBAC đơn giản, mỗi user có một hoặc nhiều role.

## Luồng chính

1. User đăng nhập bằng email/mật khẩu hoặc cơ chế đăng nhập được cấu hình.
2. Backend xác thực thông tin đăng nhập và trạng thái tài khoản.
3. Backend tạo session/access token chứa user ID và role claims.
4. Frontend dùng role để hiển thị đúng giao diện.
5. Backend kiểm tra role tại từng API endpoint bằng guard/middleware.

## Kịch bản lỗi

- Sai thông tin đăng nhập: trả `401 Unauthorized`.
- Tài khoản bị khóa: trả `403 Forbidden`.
- Không có role phù hợp: trả `403 Forbidden`.
- Token hết hạn: yêu cầu đăng nhập lại hoặc refresh token.
- User cố truy cập dữ liệu của người khác: backend kiểm tra ownership và từ chối.

## Ràng buộc

- Không tin vào việc ẩn/hiện UI ở frontend.
- API admin chỉ cho `ORGANIZER` hoặc `ADMIN`.
- API check-in chỉ cho `CHECKIN_STAFF` hoặc `ADMIN`.
- Webhook payment không dùng user role mà xác thực bằng chữ ký gateway.
- Các thao tác quan trọng phải ghi audit log.

## Tiêu chí chấp nhận

- Sinh viên không thể gọi API tạo/sửa workshop.
- Check-in staff không thể gọi API admin workshop.
- Organizer không thể xem QR riêng tư của sinh viên qua endpoint cá nhân.
- Admin có thể gán role cho user.
- Mọi request không đủ quyền đều bị backend từ chối.

