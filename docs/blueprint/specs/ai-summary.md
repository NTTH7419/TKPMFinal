# Đặc tả: AI Summary cho PDF workshop

## Mô tả

Ban tổ chức upload PDF giới thiệu workshop. Hệ thống xử lý bất đồng bộ để tách nội dung, làm sạch văn bản, gửi AI model tạo summary và tự hiển thị summary trên trang chi tiết workshop.

## Luồng chính

1. Organizer upload PDF trong Admin Web App (tối đa 20 MB, chỉ chấp nhận `application/pdf`).
2. Backend lưu file vào object storage; trả kết quả ngay mà không chờ AI.
3. Workshop document được tạo với trạng thái `UPLOADED`.
4. Backend publish job `AI_SUMMARY_REQUESTED` vào message broker.
5. Worker extract text từ PDF bằng thư viện parse (ví dụ: `pdfplumber` hoặc `Apache PDFBox`).
6. Worker clean text (loại header/footer lặp, whitespace thừa) và chia thành chunk ≤ 3.000 token mỗi chunk.
7. Worker gọi AI model với từng chunk, ghép output.
8. Worker validate output: tối thiểu 100 ký tự, không chứa lỗi mã hóa, không bị truncated.
9. Worker lưu `ai_summary`, chuyển `summary_status` sang `AI_GENERATED`.
10. Student Web App hiển thị summary.
11. Nếu admin sửa summary, trạng thái chuyển `ADMIN_EDITED`.

## Kịch bản lỗi

- PDF không đọc được (corrupted, encrypted, scan-only): `summary_status = SUMMARY_FAILED`, lưu error reason.
- PDF vượt giới hạn 20 MB: backend từ chối ngay khi upload, trả `413 Payload Too Large`.
- AI timeout (> 30 giây/lần gọi): worker retry theo backoff (1 phút → 5 phút → 15 phút), tối đa 3 lần.
- AI trả output rỗng hoặc < 100 ký tự: đánh dấu failed, lưu error reason, không publish summary.
- Admin upload PDF mới khi summary cũ đang xử lý: hủy job cũ, tạo job mới; summary cũ giữ đến khi bản mới thành công.

## Ràng buộc kỹ thuật

| Tham số | Giá trị | Lý do |
| --- | --- | --- |
| Kích thước PDF tối đa | 20 MB | Tránh tốn băng thông và thời gian parse quá lâu |
| Định dạng chấp nhận | `application/pdf` | Chỉ PDF; Word/image không được hỗ trợ |
| Chunk size | ≤ 3.000 token | Phù hợp context window phổ biến; tránh truncation |
| Timeout per AI call | 30 giây | Sau đó tính là lỗi và retry |
| Max retry | 3 lần | Sau 3 lần → `SUMMARY_FAILED` |
| Min output length | 100 ký tự | Output ngắn hơn coi là không hợp lệ |
| Xử lý đồng bộ | Không — phải async qua worker | Upload request không được block chờ AI |

- Phải lưu trạng thái xử lý (`summary_status`) để admin theo dõi.
- Summary auto-publish nhưng phải đánh dấu `AI_GENERATED` để admin biết chưa review.
- Admin có thể chỉnh sửa summary sau khi AI generate.

## Tiêu chí chấp nhận

- Upload PDF ≤ 20 MB trả kết quả trong vòng 2 giây, không chờ AI.
- PDF > 20 MB bị reject ngay với `413`.
- Summary tự xuất hiện trên trang workshop khi job thành công.
- AI timeout 3 lần liên tiếp → `SUMMARY_FAILED`, admin thấy trạng thái lỗi.
- AI lỗi không ảnh hưởng việc xem hoặc đăng ký workshop.
- Admin sửa summary làm trạng thái chuyển `ADMIN_EDITED`.
