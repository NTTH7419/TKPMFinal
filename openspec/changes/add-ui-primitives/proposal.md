## Why

The token foundation from `add-design-tokens-foundation` gives us colors, typography, spacing, rounded, and elevation — but every app still hand-rolls its own buttons, inputs, badges, cards, and tabs. Without a shared primitive layer that consumes those tokens, the upcoming `apply-design-to-{app}` changes (4a/4b/4c) would each re-implement the same components, inviting drift from `DESIGN.md` and breaking the non-breaking guarantee in [`openspec/UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md).

This change ships the small, composable building blocks — Button, Card, Input, Badge, Pill/Segmented Tab — as a versioned, accessibility-checked, type-safe library inside `packages/ui`. **No frontend app is touched.** The primitives are demoed inside the existing token preview at `localhost:6006` so reviewers can inspect every variant before any page consumes them.

## What Changes

- Add a `packages/ui/src/components/` directory housing primitive React components, each colocated with its own `.types.ts`, `.test.tsx`, and stories block in the preview app.
- Implement the following primitives (variant set derived directly from `DESIGN.md` `components:` block):
  - **Button**: variants `primary` | `dark` | `secondary` | `on-dark` | `secondary-on-dark` | `ghost` | `link`; sizes `md` (only size in spec); states `default` | `pressed` | `disabled`.
  - **Card**: variants `base` | `feature` | `feature-peach` | `feature-rose` | `feature-mint` | `feature-lavender` | `feature-sky` | `feature-yellow` | `feature-yellow-bold` | `feature-cream` | `agent-tile` | `template` | `startup-perk` | `testimonial`.
  - **Input**: `text-input` with focused state; `search-pill` companion component.
  - **Badge**: variants `purple` | `pink` | `orange` | `popular` (filled pill); `tag-purple` | `tag-orange` | `tag-green` (soft tag chip).
  - **PillTab** + **PillTabGroup**: pill-style top-level tabs (`pill-tab`, `pill-tab-active`).
  - **SegmentedTab** + **SegmentedTabGroup**: underline-style tabs (`segmented-tab`, `segmented-tab-active`).
- Export every primitive via a new `@unihub/ui/components` subpath. Per-component subpaths (`@unihub/ui/components/button`, etc.) are NOT introduced — single barrel keeps bundle-size discussions simple at this stage.
- Add a `dev/ComponentPreview.tsx` page rendering every primitive × variant × state matrix, linked from the existing token preview. Visual spot-check is the gate (per UI_REFACTOR_PRINCIPLES.md Mechanism 3 baseline).
- Add Vitest + React Testing Library unit tests asserting: (1) correct variant maps to documented tokens (via class snapshot or computed-style check); (2) `disabled` prevents `onClick`; (3) `aria-pressed` / `aria-current` is wired on active tab variants; (4) Button forwards `ref` and renders as `<a>` when `href` provided.
- Add `@unihub/ui` peer dep entry for `react` and `react-dom` so consuming apps' versions win at install time.
- **No app modifications.** No changes to `apps/admin-web`, `apps/student-web`, `apps/checkin-pwa`. Compliance with [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md) is trivially satisfied: zero observable behavior surface touched.

## Capabilities

### New Capabilities
- `design-system`: Extended with primitive-component requirements. Note: the capability was *created* by `add-design-tokens-foundation`; this change adds new requirements to the same spec rather than a new capability. Listed here under "Modified" to be precise.

### Modified Capabilities
- `design-system`: Adds requirements covering primitive component variants, state semantics (disabled / pressed / active), accessibility contracts (focus ring via `:focus-visible`, ARIA wiring on tab groups), and the `@unihub/ui/components` export surface.

## Impact

- **Code added**: `packages/ui/src/components/**` (new), `packages/ui/dev/ComponentPreview.tsx` (new), one new subpath export in `packages/ui/package.json`.
- **Code modified**: `packages/ui/package.json` (exports + peer deps), `packages/ui/tsup.config.ts` (add `components/index` entry), `packages/ui/dev/main.tsx` (mount component preview tab), `packages/ui/README.md` (document component import).
- **Apps**: Untouched. `apps/admin-web`, `apps/student-web`, `apps/checkin-pwa` keep identical bundles. `pnpm -r build` must show zero diff in their `dist/` size beyond noise.
- **Dependencies**: Possibly add `clsx` (small, ~250B) for class composition; no other runtime deps. `@testing-library/react` + `@testing-library/jest-dom` join `packages/ui` devDependencies.
- **Tests**: New unit suite under `packages/ui/src/components/**/*.test.tsx`. CI gates remain `pnpm -r build`, `pnpm -r lint`, `pnpm -r test`.
- **Risk**: Very low. Library is unused by any running app until Change 4a/4b/4c lands.
