## Context

Project là monorepo gồm 3 React apps (admin-web, student-web, checkin-pwa) + 1 shared package. Hiện tại:
- **Styling**: 100% inline `React.CSSProperties` — hardcoded hex colors, không reusable
- **Routing**: admin-web và student-web dùng `useState` để switch views (không có URL routing)
- **Responsive**: Chưa có media queries ở bất kỳ app nào
- **Loading states**: Dùng spinner đơn giản (boolean `loading` state)
- **Notifications**: student-web polling REST API mỗi 30s

Constraint cứng: Không được thay đổi API contracts, business logic, offline sync (IndexedDB), QR HMAC verification, Stripe payment integration.

## Goals / Non-Goals

**Goals:**
- Tạo `packages/ui` với CSS Modules làm foundation thay thế dần inline styles
- Chuyển admin-web và student-web sang React Router (URL-based navigation)
- Responsive layout cho student-web (mobile-first)
- Skeleton loading thay spinner ở admin-web, student-web
- Cải thiện UX checkin-pwa mà không chạm offline/sync logic
- Cải thiện UX student-web: payment step indicator, QR fullscreen, SSE notifications (nếu backend hỗ trợ, fallback về polling)
- Cải thiện UX admin-web: attendee search, import pagination

**Non-Goals:**
- Rewrite toàn bộ styling sang Tailwind (quá lớn, nằm ngoài scope)
- Thay đổi backend APIs
- Dark mode
- Animation phức tạp (Framer Motion, v.v.)
- Unit test cho UI components

## Decisions

### D1: CSS Modules thay vì Tailwind cho `packages/ui`

**Chọn: CSS Modules**

Rationale:
- Project đang dùng Vite — CSS Modules được hỗ trợ out-of-the-box, không cần config thêm
- Không cần thêm PostCSS pipeline hay purge config
- Scoped styles — không risk collision khi import vào 3 apps khác nhau
- Dễ migration từng bước: thay inline style bằng CSS Module class dần dần

Alternative rejected: **Tailwind CSS** — cần config cho cả 3 apps + packages, risk breaking existing inline styles nếu Tailwind reset/preflight chạy, học curve thêm cho team.

### D2: React Router v6 cho admin-web và student-web

**Chọn: React Router DOM v6** (đã có trong checkin-pwa, cùng version)

Rationale:
- Cùng dependency version với checkin-pwa → không thêm bundle weight mới
- Loader pattern của v6 phù hợp cho data fetching per-route sau này
- URL params thay thế state props → dễ debug, shareable links

Migration strategy:
- Giữ nguyên component logic, chỉ wrap bằng `<Routes>/<Route>`
- State được pass qua props → chuyển sang URL params hoặc React Context khi cần
- Auth guard: tạo `ProtectedRoute` component wrap các route cần auth (pattern giống checkin-pwa hiện tại)

### D3: Skeleton loading dùng CSS animation (không dùng thư viện)

**Chọn: Custom skeleton component trong `packages/ui`**

Rationale:
- Chỉ cần shimmer animation đơn giản, không cần react-loading-skeleton hay tương tự
- Tránh thêm dependency không cần thiết
- `<Skeleton width height />` component với CSS animation `@keyframes shimmer`

### D4: NotificationBell — giữ polling, không chuyển SSE

**Chọn: Giữ polling 30s**

Rationale:
- Backend hiện tại không có SSE endpoint cho notifications (chỉ có SSE cho seat updates)
- Thêm SSE endpoint cho notifications là backend change nằm ngoài scope UI refinement
- 30s polling là acceptable cho notifications (không cần real-time như seat counts)
- Có thể chuyển SSE trong task riêng sau khi backend hỗ trợ

### D5: QR Code fullscreen — dùng Fullscreen API

**Chọn: Web Fullscreen API + CSS overlay fallback**

Rationale:
- `element.requestFullscreen()` được hỗ trợ tốt trên mobile browsers
- Fallback: CSS fixed overlay toàn màn hình nếu Fullscreen API không available
- Không cần library thêm

## Risks / Trade-offs

- **[React Router migration]** → State hiện tại pass qua props giữa pages có thể bị mất khi navigate. **Mitigation**: Dùng React Context hoặc URL search params cho state cần share giữa routes. Review kỹ từng page trước khi migrate.

- **[CSS Modules + inline styles coexist]** → Trong giai đoạn chuyển đổi, một component có thể dùng cả hai. **Mitigation**: Chỉ thay inline styles ở các component được tạo mới hoặc refactor — không force-migrate toàn bộ.

- **[packages/ui import]** → Nếu Vite config của các apps không resolve đúng workspace package. **Mitigation**: Dùng `"ui": "workspace:*"` trong package.json và test build sau khi thêm dependency.

- **[Checkin-PWA offline]** → Thêm UI features (animation, counter) có thể ảnh hưởng performance trên thiết bị yếu. **Mitigation**: Animation dùng CSS `transform`/`opacity` (GPU-accelerated), không dùng JS animation loops.

## Migration Plan

1. Tạo `packages/ui` và verify build trong turbo pipeline
2. Migrate admin-web sang React Router (ít phức tạp hơn — ít pages hơn)
3. Migrate student-web sang React Router (nhiều state hơn — cần careful review)
4. Thêm Skeleton components vào admin-web và student-web
5. Cải thiện checkin-pwa UX (isolated, ít risk nhất)
6. Cải thiện student-web UX (payment steps, QR fullscreen)
7. Cải thiện admin-web UX (search, pagination)
8. Responsive design cho student-web

**Rollback**: Mỗi bước là independent PR — có thể revert từng bước mà không ảnh hưởng các bước khác.

## Open Questions

- Backend có endpoint SSE cho notifications không? Nếu có, NotificationBell có thể chuyển sang SSE trong task tách biệt.
- QR code save: dùng `canvas.toDataURL()` + download link — cần verify QR library (hiện dùng gì để render QR trong MyRegistrationsPage?)
