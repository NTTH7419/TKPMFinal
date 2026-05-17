## Why

`student-web` currently uses hand-rolled Tailwind markup with no shared token or component layer. Applying the `@unihub/ui` design system — already built and published in the monorepo — brings visual consistency across all UniHub apps, cuts per-page CSS surface area, and makes future theming changes a single-point update in `packages/ui`.

## What Changes

- Replace hand-rolled markup in all five `student-web` pages with `@unihub/ui` primitives (Button, Card, Input, Badge, Tabs) and layout components (HeroBandDark, FooterRegion, PromoBanner, etc.)
- Apply design tokens from `@unihub/ui` (colors, spacing, typography, rounded) via the Tailwind preset already consumed by the app
- Migrate `NotificationBell` component to use Badge and Button primitives
- No route paths, API calls, form schemas, or side-effect order changes — pure visual refactor per `UI_REFACTOR_PRINCIPLES.md`

## Capabilities

### New Capabilities

- `ui-student-web`: Tracks the per-page refactor work, smoke-check results, and parity-test status as mandated by `UI_REFACTOR_PRINCIPLES.md` Mechanisms 1–6

### Modified Capabilities

- `auth-rbac`: Adds UI-design-system requirement — `LoginPage` SHALL render using `@unihub/ui`; observable behavior (form validation, redirect on success, error messages) unchanged
- `workshop-catalog`: Adds UI-design-system requirement — `WorkshopListPage` and `WorkshopDetailPage` SHALL render using `@unihub/ui`; API calls and navigation unchanged
- `registration`: Adds UI-design-system requirement — `MyRegistrationsPage` SHALL render using `@unihub/ui`; query keys and state transitions unchanged
- `payment`: Adds UI-design-system requirement — `PaymentCheckoutPage` SHALL render using `@unihub/ui` behind a feature flag for the first deployment window (high-risk surface per principles)
- `notification`: Adds UI-design-system requirement — `NotificationBell` SHALL render using `@unihub/ui` Badge/Button primitives; polling behavior and toast side effects unchanged

## Impact

- **Files touched**: `apps/student-web/src/pages/*.tsx`, `apps/student-web/src/components/NotificationBell.tsx`
- **Dependencies**: `@unihub/ui` workspace package (already in `package.json`), Tailwind preset (already wired)
- **No API or DTO changes**; no changes to `apps/student-web/src/api/`
- **Test additions**: parity integration tests (Vitest + RTL) for each page must pass on `main` before refactor commits land

## Non-breaking guarantees

This change complies with [`openspec/UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md):

- The Invariant is upheld: no network requests, form field names, validation rules, storage keys, or side-effect order are changed.
- Mechanism 1 (parity tests before refactor) is satisfied per tasks.md.
- Mechanism 2 (one page per commit) is enforced in tasks.md.
- Mechanism 3 (manual smoke checklist) is provided per page in tasks.md.
- Mechanism 4 (feature flag for PaymentCheckoutPage) is planned.
- Mechanism 6 (CI gates) must pass before merge.
