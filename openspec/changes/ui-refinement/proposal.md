## Why

Toàn bộ 3 apps (admin-web, student-web, checkin-pwa) hiện dùng inline `React.CSSProperties` cho mọi style — không có shared component library, không có responsive design, không có consistent design system. Điều này khiến UI không nhất quán, khó maintain, và trải nghiệm người dùng kém trên mobile. Cần tinh chỉnh UI ngay bây giờ trước khi codebase phình to thêm.

## What Changes

- **Shared UI package** (`packages/ui`): Button, Input, Card, Badge, Skeleton components dùng CSS Modules — thay thế dần inline styles lặp lại ở cả 3 apps
- **React Router cho admin-web và student-web**: Chuyển từ state-based routing sang URL-based routing để hỗ trợ browser back/forward và shareable URLs
- **Skeleton loading** thay thế spinner ở admin-web và student-web
- **Responsive design** cho student-web (mobile-first): workshop list, detail page, payment checkout, my registrations với QR code
- **Checkin-PWA improvements**: offline status indicator rõ hơn, scan feedback animation, progress counter (đã check-in / tổng) trên WorkshopSelectPage
- **Student-web improvements**: step progress indicator cho payment flow, QR code fullscreen/save button, chuyển NotificationBell từ polling sang SSE
- **Admin-web improvements**: search/filter attendee trên WorkshopDetailPage, pagination cho ImportHistoryPage

## Capabilities

### New Capabilities

- `shared-ui-components`: Thư viện component UI dùng chung (Button, Input, Card, Badge, Skeleton) với CSS Modules trong `packages/ui`
- `url-based-routing`: React Router integration cho admin-web và student-web thay thế state-based navigation
- `responsive-student-web`: Responsive layout cho toàn bộ student-web trên mobile/tablet
- `checkin-pwa-ux`: Cải thiện UX checkin-pwa — offline indicator, scan animation, progress counter
- `student-web-ux`: Cải thiện UX student-web — payment step indicator, QR fullscreen/save, SSE notifications
- `admin-web-ux`: Cải thiện UX admin-web — attendee search/filter, import history pagination, skeleton loading

### Modified Capabilities

<!-- Không có thay đổi về spec-level requirements — chỉ là UI/UX improvements, không thay đổi API contracts hay business logic -->

## Impact

- **packages/ui**: New package, thêm vào `pnpm-workspace.yaml` và turbo pipeline
- **apps/admin-web**: Thêm `react-router-dom`, refactor App.tsx routing, cập nhật WorkshopDetailPage và ImportHistoryPage
- **apps/student-web**: Thêm `react-router-dom`, refactor App.tsx routing, cập nhật tất cả pages, chuyển notification từ polling sang SSE (cần backend SSE endpoint hoặc giữ polling nếu backend chưa hỗ trợ)
- **apps/checkin-pwa**: Cập nhật ScanPage, WorkshopSelectPage — không thay đổi IndexedDB schema hay offline sync logic
- **Không ảnh hưởng**: API contracts, auth flow, seat SSE (`useSeatStream`), QR HMAC verification, CSV import logic, payment Stripe integration, offline sync logic
