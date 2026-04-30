# Đặc tả: Nhập dữ liệu sinh viên từ CSV

## Mô tả

Hệ thống cũ không có API, chỉ export CSV ban đêm. UniHub Workshop định kỳ nhập file này để xác thực sinh viên khi đăng ký. Import phải an toàn với file lỗi, dòng trùng và lỗi giữa chừng.

## Luồng chính

1. Hệ thống cũ export CSV vào import folder/object storage.
2. Scheduler phát hiện file mới theo tên file/checksum.
3. Worker tạo `student_import_batch` trạng thái `PARSING`.
4. Worker parse file theo batch nhỏ vào `student_import_rows`.
5. Worker validate header, required fields, email, student code, duplicate và status.
6. Nếu lỗi dưới ngưỡng, batch được promote.
7. Worker mở transaction và upsert vào `students`.
8. Mỗi student được cập nhật `source_batch_id` và `last_seen_in_import_at`.
9. Batch chuyển `PROMOTED`, admin xem báo cáo.

## Kịch bản lỗi

- File thiếu cột bắt buộc: batch `REJECTED`, bảng chính không đổi.
- File trùng checksum đã import: bỏ qua hoặc đánh dấu duplicate.
- Dòng lỗi: ghi lỗi vào `student_import_rows`.
- Worker chết khi parse: retry từ file gốc.
- Worker chết khi promote: transaction rollback.
- Sinh viên không còn trong CSV: không xóa ngay, có thể chuyển `INACTIVE` theo chính sách.

## Ràng buộc

- Không import trực tiếp vào bảng `students`.
- Promotion phải atomic.
- Phải lưu audit batch.
- Phải giữ lỗi từng dòng để admin kiểm tra.
- Phải có unique constraint cho `student_code`.

## Tiêu chí chấp nhận

- CSV lỗi không làm thay đổi dữ liệu student hiện tại.
- CSV hợp lệ cập nhật được student mới và student thay đổi.
- Import lại cùng file không tạo dữ liệu trùng.
- Admin xem được số dòng thành công/lỗi.
- Hệ thống vẫn cho sinh viên đăng ký trong lúc import chạy.

