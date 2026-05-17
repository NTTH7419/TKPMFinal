## 1. Package setup

- [x] 1.1 Add `clsx` to `packages/ui` dependencies (runtime) and `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `vitest` to devDependencies
- [x] 1.2 Add `react` and `react-dom` to `packages/ui/package.json` `peerDependencies` (range `^18.0.0 || ^19.0.0`)
- [x] 1.3 Set `"sideEffects": ["*.css"]` in `packages/ui/package.json` so bundlers can tree-shake component imports
- [x] 1.4 Add `./components` subpath to `package.json#exports` mapping to `dist/components/index.{js,cjs,d.ts}` (place `types` first per existing convention)
- [x] 1.5 Add new entry `components/index: 'src/components/index.ts'` to `packages/ui/tsup.config.ts`
- [x] 1.6 Create `packages/ui/vitest.config.ts` with `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, glob `src/**/*.test.{ts,tsx}`
- [x] 1.7 Create `packages/ui/vitest.setup.ts` importing `@testing-library/jest-dom/vitest`
- [x] 1.8 Add `test` script `"test": "vitest run"` and `"test:watch": "vitest"` to `packages/ui/package.json`
- [x] 1.9 Run `pnpm install` and verify the new deps install cleanly

## 2. Shared utilities

- [x] 2.1 Create `packages/ui/src/components/utils/cn.ts` exporting `cn(...args) => clsx(args)` for class composition
- [x] 2.2 Create `packages/ui/src/styles/utilities.css` defining `.focus-ring` (outline-none + `:focus-visible` 2px ring in `--color-primary` with 2px offset)
- [x] 2.3 Wire `utilities.css` into the build: `dev/main.tsx` imports it, and add it as another subpath export `./utilities.css` in `package.json`
- [x] 2.4 Document `cn` and `focus-ring` usage in a short `packages/ui/src/components/README.md`

## 3. Button

- [x] 3.1 Create `src/components/Button/Button.types.ts` defining `ButtonVariant` union (`primary` | `dark` | `secondary` | `on-dark` | `secondary-on-dark` | `ghost` | `link`) and `ButtonProps` extending `ButtonHTMLAttributes<HTMLButtonElement> | AnchorHTMLAttributes<HTMLAnchorElement>` discriminated by `href`
- [x] 3.2 Create `Button.tsx` with `forwardRef`, class-map per variant matching `DESIGN.md` `button-*` entries, `aria-disabled` when `disabled`, `disabled` click guard, render-as-`<a>` when `href` provided
- [x] 3.3 Apply `.focus-ring` utility class in every variant's class string
- [x] 3.4 Create `Button.test.tsx`: render-default test, every-variant smoke test, `disabled` blocks `onClick`, `href` renders `<a>`, ref forwards
- [x] 3.5 Export from `Button/index.ts` and register in `src/components/index.ts`
- [x] 3.6 Run `pnpm --filter @unihub/ui test` and confirm all Button tests pass

## 4. Card

- [x] 4.1 Create `src/components/Card/Card.types.ts` defining `CardVariant` union covering every variant in the spec (base + feature + 8 pastel tints + agent-tile + template + startup-perk + testimonial)
- [x] 4.2 Create `Card.tsx` rendering a `<div>` with class map per variant matching `DESIGN.md` `card-*` entries, forwarding `className` through `cn()`
- [x] 4.3 Create `Card.test.tsx`: every variant renders without error; `feature-peach` resolves to `--color-card-tint-peach` background; children render inside
- [x] 4.4 Export from `Card/index.ts` and register in barrel

## 5. Input + SearchPill

- [x] 5.1 Create `src/components/Input/TextInput.tsx` with `forwardRef<HTMLInputElement, …>`, default class string matching `text-input`, `:focus-visible` switching to 2px primary border
- [x] 5.2 Create `src/components/Input/SearchPill.tsx` matching `search-pill` tokens (surface background, steel text, 44px height)
- [x] 5.3 Create test file asserting focused-state border switch (computed style check); search-pill resolved background is `--color-surface`
- [x] 5.4 Export both from `Input/index.ts` and register in barrel

## 6. Badge

- [x] 6.1 Create `Badge.types.ts` with `BadgeVariant` union: filled (`purple` | `pink` | `orange` | `popular`) and tag (`tag-purple` | `tag-orange` | `tag-green`)
- [x] 6.2 Create `Badge.tsx` rendering a `<span>` with per-variant class map matching `DESIGN.md` `badge-*` entries
- [x] 6.3 Create test asserting filled badges use `rounded-full` and tag badges use `rounded-sm` and correct tint background per variant
- [x] 6.4 Export and register in barrel

## 7. Tabs

- [x] 7.1 Create `src/components/Tabs/TabsContext.ts` exposing `TabsContext = createContext<{ value: string; onValueChange?: (v: string) => void; variant: 'pill' | 'segmented' }>` for group → child wiring
- [x] 7.2 Create `PillTabGroup.tsx` rendering `role="tablist"` + provider; `PillTab.tsx` consumes context, reads its own `value`, derives `aria-selected`, roving `tabIndex`, class switch between `pill-tab` and `pill-tab-active`
- [x] 7.3 Create `SegmentedTabGroup.tsx` + `SegmentedTab.tsx` mirroring above but using `segmented-tab` / `segmented-tab-active` tokens; active child also gets `aria-current="page"`
- [x] 7.4 Click on a child invokes the group's `onValueChange(value)` and the child does NOT manage its own active state
- [x] 7.5 Create tests asserting: ARIA wiring is correct for the active child; pressing left/right arrow shifts focus along the tab list; clicking a child invokes `onValueChange`
- [x] 7.6 Export from `Tabs/index.ts` and register all four in barrel

## 8. Components barrel + build

- [x] 8.1 Create `src/components/index.ts` re-exporting every primitive and its types as named exports
- [x] 8.2 Run `pnpm --filter @unihub/ui build` and verify `dist/components/index.{js,cjs,d.ts}` are emitted
- [x] 8.3 Smoke `require('@unihub/ui/components')` (CJS) and dynamic `import` (ESM) from a one-shot Node script in `/tmp` to confirm both formats load without error

## 9. Component preview surface

- [x] 9.1 Refactor `dev/main.tsx` to introduce a top-level nav with two pages: **Tokens** (existing) and **Components** (new). Use the new `SegmentedTabGroup` for the nav so the preview eats its own food
- [x] 9.2 Create `dev/ComponentPreview.tsx` with one section per primitive. Each section renders the full variant × state matrix on a clean white background
- [x] 9.3 Section: Button — one row per variant; columns `default` / `pressed` / `disabled` (pressed via inline class composition; the page must not depend on real hover)
- [x] 9.4 Section: Card — one card per variant in a 3-column grid, each containing a heading + body to show real content
- [x] 9.5 Section: Inputs — TextInput in default + focused (programmatically focused on mount), SearchPill default, side by side
- [x] 9.6 Section: Badge — one row of filled badges, one row of tag badges
- [x] 9.7 Section: Tabs — one PillTabGroup with 3 options (showing active "B"), one SegmentedTabGroup with 3 options (showing active "x")
- [x] 9.8 Run `pnpm --filter @unihub/ui dev`, open `http://localhost:6006`, visually walk every section against `DESIGN.md`. (MANUAL — record pass/fail in PR description.)

## 10. Lint & type check

- [x] 10.1 `pnpm --filter @unihub/ui lint` passes (no warnings beyond pre-existing)
- [x] 10.2 `pnpm --filter @unihub/ui exec tsc --noEmit` passes with strict mode
- [x] 10.3 `pnpm --filter @unihub/ui test` passes (every primitive's test file runs green) — 36/36 tests across Button/Card/Input/Badge/Tabs

## 11. Workspace-wide verification (non-breaking guarantee)

- [x] 11.1 `pnpm install` at repo root completes clean
- [x] 11.2 `pnpm -r build` — every package and every app builds. Specifically `apps/admin-web`, `apps/student-web`, `apps/checkin-pwa` build identically (no errors, no new warnings) — they should not yet import `@unihub/ui/components`
- [x] 11.3 `pnpm -r lint` passes for `@unihub/ui` and the three frontend apps. `apps/api` shows pre-existing lint errors that also reproduce on `main` (verified by stashing this change and re-running) — NOT caused by this change, which touches no app file.
- [x] 11.4 `pnpm -r test` passes for `@unihub/ui`. `apps/api` shows pre-existing NestJS-DI test failures that also reproduce on `main` — NOT caused by this change.
- [x] 11.5 MANUAL: start each app's dev server in turn (`pnpm --filter admin-web dev`, `…student-web…`, `…checkin-pwa…`) — every existing route renders identical to `main` with zero console errors. This is the by-construction non-breaking check from [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md)

## 12. Documentation

- [x] 12.1 Update `packages/ui/README.md` with a "Components" section listing every primitive, its variants, and a 3-line import example
- [x] 12.2 Add a one-paragraph note to the root `README.md` "Design System" section linking to the components area of the preview
- [x] 12.3 Reference this change from `openspec/UI_REFACTOR_PRINCIPLES.md` "Scope" list — note that Change 2 (`add-ui-primitives`) ships the primitive layer that future `apply-design-to-{app}` changes will consume (already in Scope list at line 12)
