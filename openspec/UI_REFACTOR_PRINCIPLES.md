# UI Refactor Principles

This document defines the **non-negotiable rules** for any OpenSpec change that introduces, refines, or applies the design system described in [`DESIGN.md`](../DESIGN.md) to the frontend apps in this repository: [`apps/admin-web`](../apps/admin-web/), [`apps/student-web`](../apps/student-web/), and [`apps/checkin-pwa`](../apps/checkin-pwa/).

It exists so that visual work never breaks the running product. Every UI-related change MUST link to this file in its `proposal.md` under a **"Non-breaking guarantees"** section and confirm compliance in `tasks.md`.

## Scope

Applies to:

- `add-design-tokens-foundation` (Change 1) — foundation, no app touched.
- `add-ui-primitives` (Change 2) — component library, no app touched.
- `add-layout-and-signature-components` (Change 3) — large/layout components, no app touched.
- `apply-design-to-student-web` / `apply-design-to-admin-web` / `apply-design-to-checkin-pwa` (Change 4a/4b/4c) — application of the system inside each app.
- Any future change that swaps markup, styles, or component imports inside `apps/*`.

Does NOT apply to changes whose primary intent is logic, data, or API contracts. If a change mixes UI and logic, split it.

## The Invariant

> A UI change MUST NOT alter the observable behavior of any capability.

"Observable behavior" means everything outside of pixels:

- Network requests sent (method, URL, headers, body shape).
- Form validation rules and error messages keyed by capability spec.
- Side effects (storage writes, navigation, toasts, analytics calls).
- Loading / empty / error / success state transitions a user can perceive in terms of *what* shows up — not *how* it looks.
- Keyboard and screen-reader accessibility paths (a refactor must not regress a11y).

If a UI change needs to alter any of the above, the logic delta MUST be extracted into a separate, prior change with its own spec delta.

## The Six Mechanisms

Every `apply-design-to-{app}` change MUST honor all six. The first three are hard requirements; the last three are strongly recommended and become required for high-risk surfaces (auth, payment, check-in scan).

### 1. Behavior parity tests written BEFORE the refactor

For each page being refactored:

- Identify the **golden path** + 2–3 critical edge cases from the relevant capability spec (`openspec/changes/build-unihub-workshop/specs/<capability>/spec.md`).
- Write or extend integration tests (Vitest + React Testing Library) that cover them.
- Tests MUST pass on `main` before the refactor commit lands.
- Tests MUST pass after the refactor with **zero modifications**. Modifying a parity test to fit new code is a red flag — it almost always means observable behavior changed.

Exception: a test may be updated if it asserted on a CSS class name or DOM structure that has no behavioral meaning. The PR description MUST call this out explicitly.

### 2. One page per commit

- Each commit swaps exactly one route/page (or one shared layout) to the new design system.
- Commit message follows the project convention and references the page: `feat(ui-student): apply design system to WorkshopDetailPage`.
- Rationale: reviewability and bisectability. If a regression appears in production, `git bisect` lands on a single page worth of diff.

### 3. Manual smoke checklist per page

`tasks.md` MUST contain a checklist for every page being touched. A task is not "done" until every box is ticked **in a real browser**, not just from `tsc` / `vitest` passing. The minimum checklist:

- [ ] Renders with realistic data (loading, empty, success, error).
- [ ] Primary interaction works (submit form, click CTA, navigate).
- [ ] Responsive at 375px, 768px, 1280px (per DESIGN.md breakpoints).
- [ ] Keyboard navigation: Tab order is logical; Enter/Escape behave per HTML defaults.
- [ ] No console errors or unhandled promise rejections.
- [ ] Network tab shows the same requests as the pre-refactor baseline.

### 4. Feature flag or parallel route for high-risk surfaces

Required for: payment checkout (`student-web`), check-in scanner (`checkin-pwa`), login flows (all apps).

- Ship the new UI behind a flag or at a parallel route (e.g. `/checkout` and `/checkout-v1`) for at least one deployment window.
- Document the rollback procedure in `tasks.md`.

Recommended elsewhere when the diff exceeds ~300 lines per page.

### 5. Visual regression baselines (recommended)

If Playwright is in place when the change starts:

- Capture screenshots of the page pre-refactor on desktop + mobile breakpoints.
- After refactor, compare. Intentional differences are noted in the PR; unintentional differences block merge.

If Playwright is NOT yet set up, this mechanism is deferred — but the manual smoke checklist (Mechanism 3) is then mandatory across all listed breakpoints.

### 6. CI gates

`pnpm -r build`, `pnpm -r lint`, and `pnpm -r test` MUST pass on the PR branch. Type-check failures are never "to be fixed in a follow-up" — they block merge.

## Boundary: What a UI change MAY change

- JSX markup structure when it does not affect a11y or test selectors keyed to behavior.
- `className` / inline styles / CSS module references.
- Component imports (swapping a hand-rolled button for `@unihub/ui` `Button`).
- Adding decorative wrapper elements that carry no semantic role.
- Adding `aria-*` attributes that improve accessibility without changing behavior.

## Boundary: What a UI change MUST NOT change

- Route paths, route params, query strings consumed by the page.
- Imports from `apps/*/src/api/` or React Query keys.
- DTO shapes from `@unihub/shared`.
- Form field `name` attributes, validation schemas, submission payloads.
- Storage keys (localStorage, IndexedDB), service worker registration, PWA manifest semantics.
- Order or identity of side effects (analytics events, toasts, navigation calls).

If you find yourself needing to change any item in this list to make the redesign work, **stop**. Open a separate logic change first.

## How each capability spec is updated

When Change 4a/4b/4c lands, each affected capability spec under [`openspec/changes/build-unihub-workshop/specs/`](changes/build-unihub-workshop/specs/) gains one new requirement:

> **Requirement: UI surfaces use the shared design system**
>
> The capability's user-facing pages SHALL render using components and tokens from `@unihub/ui` as defined in `DESIGN.md`. The capability's observable behavior — API calls, validation, state transitions, side effects, and accessibility contracts — SHALL remain unchanged across the refactor.
>
> #### Scenario: Refactor preserves behavior
> - **WHEN** a page under this capability is migrated to `@unihub/ui`
> - **THEN** all integration tests covering golden-path and documented edge cases pass without modification
> - **AND** the network request profile observed during the golden path is identical to the pre-refactor baseline

This requirement is added via the spec-delta of the `apply-design-to-{app}` change, not by editing capability specs directly.

## Escalation

If during a refactor you discover a latent bug in the page being touched:

1. Do NOT fix it inside the UI change.
2. File it, open a separate change (or fold it into the relevant capability's backlog).
3. Land the UI change preserving the buggy behavior exactly.

This rule is what keeps "non-breaking" real. Mixing opportunistic fixes into UI work is the most common cause of regressions slipping past parity tests.
