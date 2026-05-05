# ĐỒ ÁN MÔN HỌC – UniHub Workshop

## Bối cảnh

Trường Đại học A tổ chức **“Tuần lễ kỹ năng và nghề nghiệp”** hàng năm. Sự kiện kéo dài 5 ngày, mỗi ngày có 8–12 workshop diễn ra song song tại nhiều phòng khác nhau. Hiện tại ban tổ chức quản lý đăng ký bằng Google Form và thông báo qua email thủ công — quy trình này không còn đáp ứng được nhu cầu khi quy mô ngày càng lớn.

Ban tổ chức muốn xây dựng hệ thống **UniHub Workshop** để số hóa toàn bộ quy trình, từ đăng ký đến check-in tại sự kiện.

* * *

## Người dùng

| Nhóm             | Mô tả                                                           |
|------------------|-----------------------------------------------------------------|
| Sinh viên        | Xem lịch workshop, đăng ký, nhận xác nhận, check-in khi tham dự |
| Ban tổ chức      | Tạo và quản lý workshop, theo dõi số lượng đăng ký              |
| Nhân sự check-in | Xác nhận sinh viên tham dự tại cửa phòng bằng mobile app        |

* * *

## Yêu cầu hệ thống

### Xem và đăng ký workshop

Sinh viên có thể xem danh sách tất cả workshop trong tuần lễ, bao gồm thông tin diễn giả, phòng tổ chức, sơ đồ phòng và số chỗ còn lại theo thời gian thực. Sinh viên đăng ký tham dự workshop — một số workshop miễn phí, một số có thu phí. Sau khi đăng ký thành công, sinh viên nhận mã QR dùng để check-in.

### Thông báo

Sau khi đăng ký thành công, sinh viên nhận thông báo xác nhận qua app và email. Hệ thống cần thiết kế để dễ dàng bổ sung kênh thông báo mới (ví dụ: Telegram) trong các học kỳ sau mà không cần thay đổi lớn.

### Quản trị

Ban tổ chức dùng trang web admin để tạo workshop mới, cập nhật thông tin, đổi phòng, đổi giờ hoặc hủy workshop. Trang admin chỉ dành cho nội bộ và cần kiểm soát truy cập chặt chẽ — ba nhóm người dùng có quyền hạn khác nhau: sinh viên chỉ có thể xem và đăng ký workshop; ban tổ chức có quyền tạo, sửa, hủy workshop và xem thống kê; nhân sự check-in chỉ có quyền truy cập chức năng quét mã QR.

### Check-in tại sự kiện

Nhân sự tại cửa phòng dùng mobile app để quét mã QR của sinh viên. Một số khu vực trong trường có kết nối mạng không ổn định — app phải cho phép ghi nhận check-in tạm thời khi không có mạng và tự đồng bộ lại khi kết nối được phục hồi.

### AI Summary

Ban tổ chức có thể tải lên file PDF giới thiệu về workshop. Hệ thống tự động xử lý, tách nội dung, làm sạch văn bản và gửi sang mô hình AI để tạo bản tóm tắt hiển thị trên trang chi tiết workshop *(gợi ý: pipe-and-filter)*.

### Đồng bộ dữ liệu sinh viên

Hệ thống quản lý sinh viên hiện tại của trường chưa có API. Cách duy nhất để lấy dữ liệu là qua file CSV mà hệ thống cũ export vào ban đêm. UniHub Workshop cần định kỳ nhập dữ liệu này để xác thực sinh viên khi đăng ký *(gợi ý: Batch sequential)*.

* * *

## Các vấn đề cần giải quyết

**Tranh chấp chỗ ngồi:** Một số workshop chỉ có 60 chỗ nhưng có thể có hàng trăm sinh viên cố đăng ký cùng lúc ngay khi mở đăng ký. Hệ thống phải đảm bảo không có hai sinh viên nào cùng nhận được chỗ cuối cùng.

**Tải trọng đột biến:** Dự kiến khoảng 12.000 sinh viên truy cập trong 10 phút đầu khi mở đăng ký, trong đó 60% dồn vào 3 phút đầu tiên. Hệ thống cần có cơ chế bảo vệ backend API khỏi bị quá tải, ngăn chặn các client gửi request liên tục và đảm bảo tính công bằng giữa các sinh viên đăng ký *(gợi ý: Rate Limiting — Fixed Window, Sliding Window, Token Bucket, Leaky Bucket)*.

**Thanh toán không ổn định:** Nếu cổng thanh toán gặp sự cố, sinh viên vẫn phải xem được lịch workshop và thông tin sự kiện bình thường *(gợi ý: Circuit Breaker với các trạng thái Closed / Open / Half-Open, kết hợp Graceful Degradation)*. Luồng đăng ký có phí cần xử lý tình huống thanh toán timeout mà không gây ra trừ tiền hai lần, đồng thời các tính năng không liên quan đến thanh toán vẫn phải hoạt động bình thường khi cổng thanh toán gặp sự cố kéo dài *(gợi ý: Idempotency Key — cơ chế sinh key, nơi lưu trữ, cách kiểm tra trùng lặp, thời gian hết hạn)*.

**Check-in offline:** Nhân sự ở khu vực mất mạng vẫn phải check-in được cho sinh viên; dữ liệu không được mất khi kết nối trở lại.

**Tích hợp một chiều:** Không thể gọi API hệ thống cũ — chỉ có thể đọc CSV được export theo lịch cố định. Luồng nhập dữ liệu phải xử lý được file lỗi, dữ liệu trùng và không làm gián đoạn hệ thống đang chạy.

