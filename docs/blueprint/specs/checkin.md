# Đặc tả: Check-in PWA offline-first

## Mô tả

Nhân sự check-in dùng PWA để quét QR tại cửa phòng. PWA phải hoạt động khi đã preload dữ liệu ở nơi có mạng, sau đó đến khu vực mất mạng vẫn quét và lưu check-in được.

## Luồng chính

### Chuẩn bị online

1. Staff mở Check-in PWA bằng HTTPS.
2. Staff đăng nhập bằng tài khoản `CHECKIN_STAFF`.
3. Service Worker cache app shell.
4. PWA tải public key/metadata để verify signed QR.
5. PWA tải local roster registration hợp lệ.
6. PWA lưu roster, staff metadata, device ID và sync cursor vào IndexedDB.
7. PWA hiển thị trạng thái sẵn sàng offline.

### Check-in offline

1. Staff quét QR bằng camera.
2. PWA decode QR và kiểm tra chữ ký token.
3. PWA kiểm tra `registration_id`, `workshop_id`, token expiry và local roster.
4. Nếu hợp lệ, PWA tạo `checkin_event_id` UUID và lưu event `PENDING_SYNC` vào IndexedDB.
5. Nếu chưa chắc chắn, PWA lưu `NEEDS_REVIEW`.
6. Nếu QR sai chữ ký hoặc sai workshop, PWA từ chối.

### Sync khi online lại

1. PWA phát hiện online hoặc staff bấm sync.
2. PWA gửi batch event pending lên Backend API.
3. Backend xác thực role và kiểm tra event.
4. Backend upsert theo `event_id`.
5. Backend trả kết quả từng event.
6. PWA cập nhật trạng thái local.

## Kịch bản lỗi

- PWA bị đóng khi offline: event vẫn nằm trong IndexedDB.
- Sync mất mạng giữa chừng: gửi lại batch; server idempotent.
- Cùng QR quét trên hai thiết bị offline: server accepted event đầu tiên, event sau duplicate.
- Roster cũ: event có thể bị `NEEDS_REVIEW`.
- Browser xóa storage: dữ liệu local mất; cần staff install PWA và bật persistent storage nếu hỗ trợ.

## Ràng buộc

- PWA phải chạy trên HTTPS để dùng camera và service worker.
- Không phụ thuộc hoàn toàn vào native Barcode Detection API; nên dùng QR library như ZXing.
- Mỗi event có UUID riêng.
- Server là nguồn sự thật cuối cùng cho check-in.
- Token QR phải được ký và có thời hạn.

## Tiêu chí chấp nhận

- Staff preload xong có thể quét khi mất mạng.
- Event offline sync thành công khi có mạng lại.
- Gửi cùng event nhiều lần không tạo check-in trùng.
- QR sai chữ ký bị từ chối.
- QR đúng nhưng đã check-in trước đó trả duplicate.

