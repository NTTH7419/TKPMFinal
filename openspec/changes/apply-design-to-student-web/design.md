## Context

`apps/student-web` has five pages and one shared component, all written with **inline `style` objects** — no Tailwind classes, no shared tokens, no component library. The `@unihub/ui` package is already listed as a workspace dependency in `student-web/package.json` and the Tailwind preset is wired. Change 2 (add-ui-primitives) and Change 3 (add-layout-and-signature-components) have both shipped, so the full component + layout layer is available.

This design specifies the migration strategy: how to safely replace inline styles with `@unihub/ui` without touching any behavior.

## Goals / Non-Goals

**Goals:**
- Migrate all six files (`LoginPage`, `WorkshopListPage`, `WorkshopDetailPage`, `MyRegistrationsPage`, `PaymentCheckoutPage`, `NotificationBell`) from inline styles to `@unihub/ui` primitives + Tailwind token classes
- Ensure every parity test passes before and after, with zero modifications (per Mechanism 1)
- Deliver one page per commit with a manual smoke checklist (per Mechanisms 2 & 3)
- Gate `PaymentCheckoutPage` behind a parallel route `/checkout-v1` for one deployment window (per Mechanism 4)

**Non-Goals:**
- Logic changes of any kind (API calls, form schemas, validation rules, storage keys, side effects)
- Migrating `apps/admin-web` or `apps/checkin-pwa` — those are separate changes
- Adding new UI features or page flows not already present
- Setting up Playwright visual regression baselines (deferred — Playwright not yet configured)

## Decisions

### D1: Inline styles → `@unihub/ui` components + Tailwind token classes

**Decision:** Replace every inline `style={{...}}` object with the corresponding `@unihub/ui` component (`Button`, `Card`, `Input`, `Badge`, `Tabs`) or a Tailwind class string using the design-token Tailwind preset.

**Why not keep inline styles?** Inline styles bypass the token layer entirely — any future global theme update (e.g., changing `colors.primary`) would require touching every file rather than recompiling the CSS variable bundle once.

**Why not CSS Modules?** CSS Modules add a file-per-component overhead with no benefit over the already-configured Tailwind + token preset. The rest of the monorepo is moving to Tailwind.

### D2: One page per commit, parity tests first

**Decision:** Write RTL integration tests for each page on `main` before the refactor commit for that page. A refactor commit for page X ships only after its tests are green on `main`.

**Rationale:** Per `UI_REFACTOR_PRINCIPLES.md` Mechanism 1 & 2. This is the primary defense against behavioral regression. The commit history will be bisectable to a single page if a regression surfaces in production.

**Commit order (to minimize blast radius):**
1. Parity tests for all pages (single commit)
2. `LoginPage` — lowest risk, simplest form
3. `WorkshopListPage` — read-only list
4. `WorkshopDetailPage` — read-only detail + SSE seat badge
5. `NotificationBell` — shared component
6. `MyRegistrationsPage` — authenticated list
7. `PaymentCheckoutPage` — high-risk, feature-flagged (parallel route)

### D3: PaymentCheckoutPage ships behind `/checkout-v1` parallel route

**Decision:** The redesigned checkout renders at `/checkout-v1` for one deployment window. The existing `/checkout` route remains untouched. After validation, routes swap and the old path is removed in a follow-up commit.

**Why:** Payment is a high-risk surface per Mechanism 4. A parallel route provides instant rollback (point users back to `/checkout`) without a redeploy.

### D4: `SeatBadge` inline styles → `@unihub/ui` `Badge` + Tailwind semantic colors

**Decision:** `SeatBadge` inside `WorkshopListPage` (and `WorkshopDetailPage`) uses hardcoded `#22c55e` / `#ef4444`. Replace with `badge-tag-green` / semantic error token via Tailwind class.

**Why:** Keeps the behavior-parity contract clean — the badge renders the same color signal (green = seats available, red = full) using the token system rather than magic hex values.

### D5: No new test selectors introduced

**Decision:** RTL parity tests MUST use `getByRole`, `getByText`, or `data-testid` attributes that already exist on the current DOM (or are added to the current `main` page first, in the same pre-refactor test commit).

**Why:** Parity tests that reference className-based selectors would need updating after the refactor — that would violate Mechanism 1's "zero modifications" rule.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Inline-style-only app has no existing RTL tests — parity baseline must be written from scratch | Write tests covering golden path + 2–3 edge cases per page before the first refactor commit; tests must be green on `main` |
| `useSeatStream` SSE hook is involved in `WorkshopListPage` and `WorkshopDetailPage`; mocking it incorrectly could hide a regression | Mock at the module boundary via `vi.mock('../hooks/useSeatStream')` in RTL tests; verify the same mock passes on both pre- and post-refactor |
| `PaymentCheckoutPage` holds payment submission logic; visual changes risk accidentally altering button `type` or form handler wire-up | Parity test must assert the submit event fires with the correct payload; parallel-route strategy adds rollback safety net |
| `@unihub/ui` components introduce slightly different DOM structure (extra wrapper divs, etc.) that could break existing `querySelector`-based test assertions | All new parity tests must avoid structural selectors; any existing tests using structural selectors must be updated in the pre-refactor test commit with explicit call-out in the PR |

## Migration Plan

1. **Pre-refactor (on `main`):** Write and land a single commit with RTL parity tests for all six files. CI must be green.
2. **Per-page commits:** One commit per page in the order listed in D2. Each commit includes only JSX/style changes for that page.
3. **Parallel route (PaymentCheckoutPage):** `PaymentCheckoutPage` refactor commit adds `/checkout-v1` route; existing `/checkout` unchanged.
4. **Validation window:** Deploy to staging. Run manual smoke checklist from tasks.md. Wait one deployment cycle.
5. **Route swap:** Follow-up commit swaps routes, removes old path + feature-flag code.

**Rollback:** Any single-page commit can be reverted via `git revert <sha>` without affecting other pages. For payment, point the nav link back to `/checkout` while the revert is staged.

## Open Questions

- None blocking. The `@unihub/ui` component API is already shipped and documented in `packages/ui/README.md`.
