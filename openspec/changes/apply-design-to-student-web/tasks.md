## 1. Pre-refactor Parity Tests (land on `main` first)

- [x] 1.1 Write RTL parity tests for `LoginPage`: golden path (successful login), invalid credentials error, loading state
- [x] 1.2 Write RTL parity tests for `WorkshopListPage`: workshops render, seat badge shows available, seat badge shows full, empty state
- [x] 1.3 Write RTL parity tests for `WorkshopDetailPage`: detail renders, register CTA fires `POST /registrations`, error state
- [x] 1.4 Write RTL parity tests for `MyRegistrationsPage`: list renders with all status variants (`CONFIRMED`, `PENDING_PAYMENT`, `CANCELLED`), empty state
- [x] 1.5 Write RTL parity tests for `PaymentCheckoutPage`: submission fires `POST /payments` with correct payload, error state, loading state
- [x] 1.6 Write RTL parity tests for `NotificationBell`: unread count renders, mark-as-read fires `PATCH /notifications/:id`, zero-unread state
- [x] 1.7 Run `pnpm -r test` — all new parity tests MUST pass on `main` before any refactor commit

## 2. LoginPage Refactor

- [x] 2.1 Replace inline `style` objects with `@unihub/ui` `Input` and `Button` primitives and Tailwind token classes
- [x] 2.2 Wrap the form in `Card` (`card-base` variant) centered on a `surface` background
- [x] 2.3 Verify parity tests from 1.1 pass with zero modifications
- [ ] 2.4 Manual smoke checklist — LoginPage:
  - [ ] Renders loading, error, success states with realistic data
  - [ ] Submit button fires login on Enter and click
  - [ ] Responsive at 375px, 768px, 1280px
  - [ ] Tab order: email → password → submit button; logical
  - [ ] No console errors or unhandled promise rejections
  - [ ] Network tab: single `POST /auth/login` request with `{email, password}` body

## 3. WorkshopListPage Refactor

- [x] 3.1 Replace inline `style` cards with `@unihub/ui` `Card` (`card-base` variant) per workshop row
- [x] 3.2 Replace inline-style `SeatBadge` with `@unihub/ui` `Badge` (`badge-tag-green` when seats > 0, semantic error token when full)
- [x] 3.3 Replace loading/error states with Tailwind token classes
- [x] 3.4 Verify parity tests from 1.2 pass with zero modifications
- [ ] 3.5 Manual smoke checklist — WorkshopListPage:
  - [ ] Renders loading, empty, success, error states
  - [ ] Clicking a workshop navigates to detail page
  - [ ] Seat badge updates in real-time via SSE
  - [ ] Responsive at 375px, 768px, 1280px
  - [ ] No console errors or unhandled promise rejections
  - [ ] Network tab: `GET /workshops` only; SSE connection established

## 4. WorkshopDetailPage Refactor

- [x] 4.1 Replace inline styles with `@unihub/ui` layout and `Card` components
- [x] 4.2 Replace register CTA button with `@unihub/ui` `Button` (`button-primary` variant)
- [x] 4.3 Replace status/error messages with Tailwind token classes
- [x] 4.4 Verify parity tests from 1.3 pass with zero modifications
- [ ] 4.5 Manual smoke checklist — WorkshopDetailPage:
  - [ ] Renders loading, success, error states
  - [ ] Register CTA fires `POST /registrations` and shows confirmation/error
  - [ ] Responsive at 375px, 768px, 1280px
  - [ ] Keyboard: Tab to register button, Enter triggers submit
  - [ ] No console errors or unhandled promise rejections
  - [ ] Network tab: `GET /workshops/:id` on load; `POST /registrations` on CTA click

## 5. NotificationBell Refactor

- [x] 5.1 Replace inline-style bell button with `@unihub/ui` `Button` (`button-ghost` variant)
- [x] 5.2 Replace unread count badge with `@unihub/ui` `Badge` (`badge-purple` variant)
- [x] 5.3 Replace dropdown panel with `@unihub/ui` `Card` (`card-base` variant)
- [x] 5.4 Verify parity tests from 1.6 pass with zero modifications
- [ ] 5.5 Manual smoke checklist — NotificationBell:
  - [ ] Badge shows correct unread count
  - [ ] Clicking bell opens/closes dropdown
  - [ ] Clicking a notification fires `PATCH /notifications/:id`
  - [ ] No console errors or unhandled promise rejections
  - [ ] Network tab: `GET /notifications` on mount; `PATCH /notifications/:id` on click

## 6. MyRegistrationsPage Refactor

- [x] 6.1 Replace inline-style list with `@unihub/ui` `Card` (`card-base` variant) per registration
- [x] 6.2 Replace status labels with `@unihub/ui` `Badge` (green=`CONFIRMED`, orange=`PENDING_PAYMENT`, neutral=`CANCELLED`)
- [x] 6.3 Verify parity tests from 1.4 pass with zero modifications
- [ ] 6.4 Manual smoke checklist — MyRegistrationsPage:
  - [ ] Renders loading, empty, success, error states
  - [ ] All three status badge variants render correctly
  - [ ] Responsive at 375px, 768px, 1280px
  - [ ] No console errors or unhandled promise rejections
  - [ ] Network tab: `GET /registrations` only

## 7. PaymentCheckoutPage Refactor (feature-flagged)

- [x] 7.1 Add `/checkout-v1` parallel route in `App.tsx` pointing to a new `PaymentCheckoutPageV2` component (copy of existing page)
- [x] 7.2 Refactor `PaymentCheckoutPageV2` with `@unihub/ui` `Card`, `Input`, and `Button` (`button-primary` variant for submit)
- [x] 7.3 Verify parity tests from 1.5 pass against the new `PaymentCheckoutPageV2` component with zero modifications
- [ ] 7.4 Manual smoke checklist — PaymentCheckoutPage (at `/checkout-v1`):
  - [ ] Renders loading, success, error states with realistic payment data
  - [ ] Submit button fires `POST /payments` with correct payload on click and Enter
  - [ ] Redirect on success matches pre-refactor target
  - [ ] Responsive at 375px, 768px, 1280px
  - [ ] Keyboard: Tab order through all fields → submit; logical
  - [ ] No console errors or unhandled promise rejections
  - [ ] Network tab: `POST /payments` payload identical to pre-refactor baseline
- [x] 7.5 Document rollback procedure: to roll back, update the nav link `href` from `/checkout-v1` back to `/checkout`; no redeploy required
  - **Note (SPA):** This app uses state-based routing (no URL router). Rollback = revert `App.tsx` to import the old inline-style `PaymentCheckoutPage`. The old component was merged into `PaymentCheckoutPage.tsx` as the V2 design — `git revert` the checkout-page commit to restore the pre-refactor version.

## 8. Route Swap and Cleanup (after validation window)

- [x] 8.1 Swap `/checkout` and `/checkout-v1` routes: make `PaymentCheckoutPageV2` the default at `/checkout`
- [x] 8.2 Remove old `PaymentCheckoutPage` inline-style component and the `/checkout-v1` parallel route
- [x] 8.3 Run full parity test suite — all tests must pass

## 9. CI Gates

- [x] 9.1 `pnpm -r build` passes on the PR branch
- [x] 9.2 `pnpm -r lint` passes on the PR branch
- [x] 9.3 `pnpm -r test` passes on the PR branch (all parity tests green)
