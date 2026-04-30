# UniHub Workshop - Project Proposal

## Vấn đề

Trường Đại học A tổ chức "Tuần lễ kỹ năng và nghề nghiệp" hằng năm trong 5 ngày, mỗi ngày có 8-12 workshop diễn ra song song tại nhiều phòng. Quy trình hiện tại dùng Google Form và email thủ công không còn đáp ứng được quy mô sự kiện.

Các vấn đề chính:

- Sinh viên khó xem lịch tổng thể, số chỗ còn lại, vị trí phòng và trạng thái đăng ký theo thời gian thực.
- Google Form không đảm bảo chống oversell khi nhiều sinh viên cùng tranh chỗ cuối cùng.
- Ban tổ chức phải xử lý xác nhận, thay đổi lịch, đổi phòng, gửi email và thống kê thủ công.
- Check-in tại cửa phòng phụ thuộc mạng và dễ thất lạc dữ liệu.
- Workshop có phí cần xử lý thanh toán an toàn, tránh trừ tiền hai lần.
- Dữ liệu sinh viên chỉ có thể nhập từ CSV export ban đêm, không có API đồng bộ trực tiếp.
- PDF giới thiệu workshop cần được xử lý và tóm tắt tự động để giảm công việc cho ban tổ chức.

Nếu tiếp tục dùng quy trình cũ, hệ thống dễ nghẽn lúc mở đăng ký, dữ liệu đăng ký thiếu nhất quán, email xác nhận chậm, check-in thiếu tin cậy và ban tổ chức khó kiểm soát thay đổi trong suốt sự kiện.

## Mục tiêu

UniHub Workshop cần số hóa quy trình từ đăng ký đến check-in, với các mục tiêu:

- Hỗ trợ khoảng 12.000 sinh viên truy cập trong 10 phút đầu mở đăng ký, trong đó 60% dồn vào 3 phút đầu.
- Đảm bảo không có hai sinh viên cùng nhận một chỗ cuối cùng của workshop.
- Cho phép sinh viên xem lịch, đăng ký workshop miễn phí/có phí, nhận QR và thông báo xác nhận.
- Cho phép ban tổ chức tạo, sửa, đổi phòng, đổi giờ, hủy workshop và xem thống kê.
- Cho phép nhân sự check-in dùng PWA để quét QR kể cả khi mất mạng tạm thời.
- Tích hợp payment theo hướng chịu lỗi, không ảnh hưởng các chức năng khác khi gateway gặp sự cố.
- Nhập dữ liệu sinh viên từ CSV theo lịch, xử lý file lỗi và dữ liệu trùng mà không làm gián đoạn hệ thống.
- Tự động xử lý PDF và tạo AI summary hiển thị trên trang chi tiết workshop.
- Thiết kế notification dễ mở rộng thêm kênh mới như Telegram trong các học kỳ sau.

## Người dùng và nhu cầu

| Nhóm người dùng | Nhu cầu chính | Điều quan trọng nhất |
| --- | --- | --- |
| Sinh viên | Xem lịch, lọc workshop, đăng ký, thanh toán, nhận QR, nhận thông báo | Đăng ký công bằng, biết kết quả rõ ràng, không bị trừ tiền hai lần |
| Ban tổ chức | Quản lý workshop, thay đổi lịch/phòng, upload PDF, xem thống kê | Dữ liệu nhất quán, thao tác nhanh, audit được thay đổi |
| Nhân sự check-in | Quét QR tại cửa phòng, ghi nhận tham dự | Dùng được khi mạng yếu/mất mạng, không mất dữ liệu |
| Quản trị hệ thống | Quản lý tài khoản, vai trò, cấu hình | Kiểm soát truy cập và theo dõi lỗi |

## Phạm vi

Thuộc phạm vi:

- Student Web App để xem lịch, đăng ký, thanh toán và xem QR.
- Admin Web App để quản lý workshop, thống kê, PDF, import CSV.
- Check-in PWA offline-first cho nhân sự check-in.
- Backend API theo kiến trúc modular monolith.
- Background workers cho notification, payment timeout/reconcile, CSV import và AI summary.
- Database schema cho user, role, student, workshop, registration, payment, check-in, import, notification.
- Cơ chế bảo vệ: virtual queue, rate limiting, idempotency key, circuit breaker.
- C4 diagram Level 1, Level 2 và high-level architecture diagram.

Không thuộc phạm vi bản thiết kế đầu:

- Tích hợp payment gateway thật ở môi trường production.
- Hạ tầng production chi tiết như Kubernetes, autoscaling policy cấp cloud, observability dashboard đầy đủ.
- SSO chính thức với hệ thống định danh của trường.
- Phân quyền scoped theo từng phòng/workshop cho check-in staff. Bản đầu dùng RBAC đơn giản.
- Rule engine notification cho phép admin tự cấu hình kịch bản phức tạp.
- Native mobile app. Check-in dùng PWA thay thế.

## Rủi ro và ràng buộc

| Rủi ro/ràng buộc | Tác động | Hướng xử lý |
| --- | --- | --- |
| Tranh chấp chỗ ngồi | Oversell, mất công bằng | PostgreSQL transaction + row lock + hold slot |
| Tải đột biến | Backend quá tải, request spam | Virtual queue + token bucket rate limit + idempotency |
| Payment gateway không ổn định | Thanh toán lỗi, double charge, ảnh hưởng hệ thống | Async payment intent + webhook + circuit breaker |
| Check-in offline | Không thể xác minh hoặc mất dữ liệu khi mất mạng | PWA offline-first + signed QR + local roster + IndexedDB event log |
| CSV lỗi hoặc trùng dữ liệu | Làm hỏng bảng student chính | Staging table + validation + atomic promotion + batch audit |
| AI provider lỗi/chậm | Upload workshop bị ảnh hưởng nếu xử lý đồng bộ | Async AI summary job, trạng thái `SUMMARY_FAILED`, retry |
| Notification provider lỗi | Không gửi được email xác nhận | Notification queue, channel adapter, retry theo kênh |
| RBAC đơn giản | Staff có thể có quyền check-in rộng hơn cần thiết | Audit log, tài khoản riêng, giới hạn chức năng UI; có thể nâng cấp scoped permissions sau |

