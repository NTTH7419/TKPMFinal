## 1. Shared UI Package Setup

- [x] 1.1 Tạo `packages/ui/package.json` với name `@unihub/ui`, cấu hình exports và CSS Modules
- [x] 1.2 Tạo `packages/ui/tsconfig.json` kế thừa root tsconfig
- [x] 1.3 Thêm `packages/ui` vào `pnpm-workspace.yaml` và turbo pipeline
- [x] 1.4 Thêm `"@unihub/ui": "workspace:*"` vào dependencies của admin-web, student-web
- [x] 1.5 Verify build: pnpm install thành công, workspace linked

## 2. Shared UI Components

- [x] 2.1 Tạo `Button` component với CSS Module (`button.module.css`) — variants: primary, secondary, danger; sizes: sm, md, lg; disabled state
- [x] 2.2 Tạo `Input` component với CSS Module — props: label, error, placeholder + HTML input attrs
- [x] 2.3 Tạo `Card` component với CSS Module — props: padding, shadow
- [x] 2.4 Tạo `Badge` component với CSS Module — variants: success, warning, error, info, neutral
- [x] 2.5 Tạo `Skeleton` component với CSS Module — shimmer animation với `@keyframes`, props: width, height, borderRadius
- [x] 2.6 Export tất cả components từ `packages/ui/src/index.ts`

## 3. React Router — Admin-web

- [x] 3.1 Thêm `react-router-dom` vào `apps/admin-web/package.json` (đã có sẵn)
- [x] 3.2 Wrap app với `<BrowserRouter>` trong `main.tsx`
- [x] 3.3 Tạo `ProtectedRoute` component kiểm tra auth token trong localStorage
- [x] 3.4 Refactor `App.tsx`: thay state-based view switching bằng `<Routes>` với paths `/login`, `/workshops`, `/workshops/:id`, `/import-history`
- [x] 3.5 Cập nhật WorkshopDetailPage để đọc workshop id từ `useParams()` thay vì props
- [x] 3.6 Cập nhật navigation links (back buttons, menu items) dùng `useNavigate()` hoặc `<Link>`
- [ ] 3.7 Test: login redirect, navigate to detail, browser back, logout redirect

## 4. React Router — Student-web

- [x] 4.1 Thêm `react-router-dom` vào `apps/student-web/package.json` (đã có sẵn)
- [x] 4.2 Wrap app với `<BrowserRouter>` trong `main.tsx`
- [x] 4.3 Tạo `ProtectedRoute` component kiểm tra auth token
- [x] 4.4 Refactor `App.tsx`: thay state-based switching bằng `<Routes>` với paths `/login`, `/workshops`, `/workshops/:id`, `/my-registrations`, `/payment/:registrationId`
- [x] 4.5 Cập nhật WorkshopDetailPage để đọc id từ `useParams()` — `useSeatStream` vẫn hoạt động với id từ params
- [x] 4.6 Cập nhật PaymentCheckoutPage để đọc registrationId từ `useParams()`
- [x] 4.7 Cập nhật navigation links và back buttons (dùng useNavigate/Link)
- [ ] 4.8 Test: tất cả routes hoạt động, seat SSE vẫn active khi navigate, auth redirect

## 5. Skeleton Loading — Admin-web

- [x] 5.1 Import `Skeleton` từ `@unihub/ui` vào admin-web
- [x] 5.2 Thay spinner loading trong `WorkshopListPage` bằng skeleton rows (3-5 skeleton items)
- [x] 5.3 Thay spinner loading trong `WorkshopDetailPage` (workshop info section) bằng skeleton
- [ ] 5.4 Thay spinner loading trong attendee table bằng skeleton rows (N/A — không có attendee table riêng trong WorkshopDetailPage hiện tại)

## 6. Skeleton Loading — Student-web

- [x] 6.1 Import `Skeleton` từ `@unihub/ui` vào student-web
- [x] 6.2 Thay spinner trong `WorkshopListPage` bằng 3 skeleton card placeholders
- [x] 6.3 Thay spinner trong `WorkshopDetailPage` bằng skeleton layout (title, description, seat count)
- [x] 6.4 Thay spinner trong `MyRegistrationsPage` bằng skeleton registration cards

## 7. Admin-web UX Improvements

- [x] 7.1 Thêm search input vào `WorkshopDetailPage` attendee section
- [x] 7.2 Implement client-side filter logic: filter attendee list by name/email (case-insensitive, `useMemo`)
- [x] 7.3 Thêm "clear search" button (X icon) khi có text trong search input
- [x] 7.4 Implement pagination cho `ImportHistoryPage`: đã có sẵn server-side pagination
- [x] 7.5 Tạo pagination controls UI: đã có sẵn trong ImportHistoryPage

## 8. Checkin-PWA UX Improvements

- [x] 8.1 Thêm online/offline event listeners vào `ScanPage` (đã có sẵn)
- [x] 8.2 Tạo `OfflineIndicator` component trong checkin-pwa: hiển thị status (green Online / red Offline) + pending count
- [x] 8.3 Query IndexedDB để đếm pending (unsynced) check-in events và hiển thị trong indicator
- [x] 8.4 Cập nhật indicator khi sync hoàn thành (dùng `syncing` prop)
- [x] 8.5 Thêm `feedbackKind: 'idle' | 'success' | 'error'` state vào `ScanPage`
- [x] 8.6 Implement visual feedback: fixed overlay flash (green/red) + icon
- [x] 8.7 Implement haptic feedback: `navigator.vibrate(200)` on success, `navigator.vibrate([100,50,100])` on error
- [x] 8.8 Auto-reset feedback state sau 2 giây (`setTimeout` → `setFeedbackKind('idle')`)
- [x] 8.9 Thêm `getCheckinCount` vào db.ts, query synced check-ins per workshop trong WorkshopSelectPage
- [x] 8.10 Hiển thị "X / Y đã check-in" cho mỗi workshop trong danh sách

## 9. Student-web UX Improvements

- [x] 9.1 Tạo `StepIndicator` component trong student-web: props `steps: string[]`, `currentStep: number`
- [x] 9.2 Tích hợp `StepIndicator` vào `PaymentCheckoutPage` với steps ["Review", "Payment", "Confirmed"]
- [x] 9.3 Cập nhật `currentStep` state khi user tiến qua các bước payment flow
- [x] 9.4 Thêm fullscreen button vào QR code card trong `MyRegistrationsPage`
- [x] 9.5 Implement fullscreen logic: `element.requestFullscreen()` với CSS overlay fallback
- [x] 9.6 Handle close fullscreen: click outside hoặc Escape key → `document.exitFullscreen()`
- [x] 9.7 Thêm "Save QR" button: render QR vào `<canvas>`, gọi `canvas.toDataURL('image/png')`, trigger download link
- [x] 9.8 Đặt filename download là `qr-<workshop-name>.png`

## 10. Responsive Design — Student-web

- [x] 10.1 Thêm CSS media queries (`@media (max-width: 768px)`) cho layout chính của student-web
- [x] 10.2 Cập nhật `WorkshopListPage`: workshop cards stack vertically trên mobile, full-width
- [x] 10.3 Cập nhật `WorkshopDetailPage`: single-column layout trên mobile, register button full-width
- [x] 10.4 Cập nhật `PaymentCheckoutPage`: form fields full-width trên mobile, Stripe input responsive
- [x] 10.5 Cập nhật `MyRegistrationsPage`: QR code centered và min 200px trên mobile
- [x] 10.6 Cập nhật navigation header: stacked/hamburger layout trên mobile (< 768px)
- [ ] 10.7 Test responsive: verify ở 375px (iPhone SE), 390px (iPhone 14), 768px (tablet)

## 11. Verification & Integration

- [x] 11.1 Chạy `pnpm build` cho toàn bộ monorepo — đảm bảo không có TypeScript errors
- [ ] 11.2 Smoke test admin-web: login, list workshops, open detail, search attendees, import history pagination
- [ ] 11.3 Smoke test student-web: login, browse workshops, register, payment flow, my registrations + QR
- [ ] 11.4 Smoke test checkin-pwa: login, select workshop, scan QR, offline mode (disable network), sync
- [ ] 11.5 Verify seat SSE vẫn hoạt động đúng sau React Router migration trong student-web
- [ ] 11.6 Verify CSV import flow không bị ảnh hưởng trong admin-web
