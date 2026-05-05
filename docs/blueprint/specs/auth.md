# Đặc tả: Auth và RBAC

## Mô tả

Tính năng Auth/RBAC quản lý đăng nhập, phiên làm việc và phân quyền cho bốn nhóm: sinh viên, ban tổ chức, nhân sự check-in và admin. Hệ thống dùng RBAC đơn giản, mỗi user có một hoặc nhiều role.

## Cơ chế token: JWT

Hệ thống chọn **JWT (JSON Web Token)** thay cho server-side session vì:
- Backend là Modular Monolith có thể scale nhiều instance — JWT stateless, không cần session store chung.
- Check-in PWA cần gắn token vào request offline-friendly.
- Tradeoff: không thể thu hồi token trước hạn nếu không dùng blocklist; giải quyết bằng access token TTL ngắn.

### Cấu trúc token

| Loại | Lưu tại | TTL | Payload |
| --- | --- | --- | --- |
| **Access Token** | Memory (client) / `Authorization: Bearer` header | 15 phút | `user_id`, `roles[]`, `iat`, `exp` |
| **Refresh Token** | HTTP-only cookie / secure storage | 7 ngày | `user_id`, `jti` (JWT ID unique), `exp` |

### Luồng refresh token

1. Access token hết hạn — client nhận `401`.
2. Client gửi refresh token lên `POST /auth/refresh`.
3. Backend kiểm tra refresh token còn hạn và chưa bị revoke (`jti` không có trong Redis blocklist).
4. Backend phát access token mới (15 phút) và refresh token mới (rotate, 7 ngày).
5. Refresh token cũ bị revoke bằng cách lưu `jti` vào Redis với TTL = thời gian còn lại.

### Bảo mật mật khẩu

- Mật khẩu hash bằng **bcrypt** với cost factor ≥ 12.
- Không lưu plaintext hay MD5/SHA-1.

## Luồng chính

1. User đăng nhập bằng email/mật khẩu.
2. Backend kiểm tra `users.status` (active/locked) và xác thực bcrypt hash.
3. Backend tạo access token (JWT, 15 phút) và refresh token (JWT, 7 ngày).
4. Frontend lưu access token trong memory; refresh token trong HTTP-only cookie.
5. Mỗi request API gắn `Authorization: Bearer <access_token>`.
6. Backend guard decode token, kiểm tra `exp` và `roles[]`, enforce quyền.
7. Frontend tự động refresh khi nhận `401`; nếu refresh token cũng hết hạn — redirect đăng nhập lại.

## Kịch bản lỗi

- Sai thông tin đăng nhập: trả `401 Unauthorized`.
- Tài khoản bị khóa (`status = LOCKED`): trả `403 Forbidden`.
- Không có role phù hợp: trả `403 Forbidden`.
- Access token hết hạn (15 phút): client dùng refresh token lấy token mới.
- Refresh token hết hạn (7 ngày) hoặc đã revoke: trả `401`, yêu cầu đăng nhập lại.
- User cố truy cập dữ liệu của người khác: backend kiểm tra ownership (`student_id` hoặc `user_id`) và từ chối.

## Ràng buộc

- Không tin vào việc ẩn/hiện UI ở frontend; backend là nơi enforce duy nhất.
- API admin chỉ cho `ORGANIZER` hoặc `ADMIN`.
- API check-in chỉ cho `CHECKIN_STAFF` hoặc `ADMIN`.
- Webhook payment không dùng user role mà xác thực bằng chữ ký HMAC của gateway.
- Refresh token phải rotate mỗi lần dùng (old token revoke, new token phát).
- Các thao tác quan trọng ghi audit log gồm: đăng nhập, đổi role, tạo/hủy workshop, revoke token.

## Tiêu chí chấp nhận

- Sinh viên không thể gọi API tạo/sửa workshop.
- Check-in staff không thể gọi API admin workshop.
- Organizer không thể xem QR riêng tư của sinh viên qua endpoint cá nhân.
- Admin có thể gán role cho user.
- Mọi request không đủ quyền đều bị backend từ chối với `401` hoặc `403`.
- Refresh token đã dùng không thể dùng lại.
- Access token hết hạn sau đúng 15 phút.
