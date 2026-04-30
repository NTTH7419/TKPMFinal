# Đặc tả: AI Summary cho PDF workshop

## Mô tả

Ban tổ chức upload PDF giới thiệu workshop. Hệ thống xử lý bất đồng bộ để tách nội dung, làm sạch văn bản, gửi AI model tạo summary và tự hiển thị summary trên trang chi tiết workshop.

## Luồng chính

1. Organizer upload PDF trong Admin Web App.
2. Backend lưu file vào object storage.
3. Workshop document được tạo với trạng thái `UPLOADED`.
4. Backend tạo job `AI_SUMMARY_REQUESTED`.
5. Worker extract text từ PDF.
6. Worker clean/chunk text và gọi AI model.
7. Worker validate output.
8. Worker lưu `ai_summary`, chuyển `summary_status` sang `AI_GENERATED`.
9. Student Web App hiển thị summary.
10. Nếu admin sửa summary, trạng thái chuyển `ADMIN_EDITED`.

## Kịch bản lỗi

- PDF không đọc được: `summary_status = SUMMARY_FAILED`.
- AI timeout: worker retry theo backoff.
- AI trả output rỗng/không hợp lệ: đánh dấu failed và lưu error reason.
- Admin upload PDF mới: tạo job mới, summary cũ có thể giữ đến khi bản mới thành công.

## Ràng buộc

- Không xử lý PDF/AI đồng bộ trong request upload.
- Phải lưu trạng thái xử lý để admin biết.
- Summary auto-publish nhưng phải đánh dấu `AI_GENERATED`.
- Admin có thể chỉnh sửa summary sau.

## Tiêu chí chấp nhận

- Upload PDF trả kết quả nhanh, không chờ AI.
- Summary tự xuất hiện khi job thành công.
- AI lỗi không ảnh hưởng workshop.
- Admin sửa summary làm trạng thái chuyển `ADMIN_EDITED`.

