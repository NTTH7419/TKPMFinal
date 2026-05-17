## Context

The token foundation (`add-design-tokens-foundation`, archived) installed `@unihub/ui` with tokens, a Tailwind preset (with `corePlugins.preflight = false`), CSS variables, and a Vite preview surface at `localhost:6006`. No app uses Tailwind classes yet — they were wired to enable utility generation but pages still render with their pre-existing styles.

This change ships the React primitive layer (Button, Card, Input, Badge, PillTab, SegmentedTab) that future `apply-design-to-{app}` changes will consume. The primitive layer is the bridge: it turns raw tokens into ergonomically typed components a page author can drop in without manually composing utility classes.

Stakeholders:
- **Frontend authors** (Change 4a/4b/4c): need primitives with stable APIs.
- **Designers**: need the live preview to match `DESIGN.md` exactly.
- **Reviewers**: need to know nothing in the running apps changes.

## Goals / Non-Goals

**Goals:**
- Implement every primitive variant enumerated in `DESIGN.md` `components:` block — exhaustive coverage, no "we'll add it later".
- Strong TypeScript variant typing so misuse fails at compile time (`variant="primary"` autocompletes; `variant="primay"` is a type error).
- Accessibility baked in: `:focus-visible` ring, ARIA roles/states on tab groups, disabled state communicated to assistive tech.
- Snapshot/visual matrix in the Vite preview so reviewers can spot-check every variant × state combination against `DESIGN.md`.
- Zero observable change to any running app. Compliance with [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md) is by construction — no app file is touched.

**Non-Goals:**
- Hover states (per `DESIGN.md` "Per the no-hover policy, hover states are NOT documented"). The library will not implement decorative hover styles.
- Compound layout components (`HeroBandDark`, `WorkspaceMockupCard`, `PricingCard`, `FAQAccordionItem`, etc.) — those live in `add-layout-and-signature-components` (Change 3).
- Dark mode tokens / theming. Tokens only document the light theme; the few "on-dark" variants in this change reference fixed dark-surface tokens.
- Animation tokens. Defer to Change 3 or a later change.
- Storybook. The Vite preview is the deliberate, lighter alternative.

## Decisions

### D1. Class-string composition via `clsx`, not `cva` / `tailwind-variants`

**Choice**: Use `clsx` (~250 B) to compose class strings. Variant → class map is a plain object literal.

**Why**:
- The variant set is closed (defined by `DESIGN.md`); we don't need runtime variant computation.
- `cva` / `tailwind-variants` add complexity for ergonomics we don't need — variants are flat, not nested.
- A plain object map is greppable and trivially typed via `keyof typeof variants`.

**Alternatives considered**:
- `class-variance-authority` (cva): nicer DX for compound variants, but we have none.
- Pure inline `${condition ? ... : ...}` chains: fine for 2 variants, becomes unreadable at 10+.

### D2. Each component is one file under `src/components/<Name>/`

**Structure**:
```
src/components/Button/
  Button.tsx            # the component
  Button.types.ts       # variant unions + Props
  Button.test.tsx       # unit tests
  index.ts              # named re-export
src/components/index.ts # barrel re-export all primitives
```

**Why**: Collocation makes review and search easy. The barrel lets consuming apps do `import { Button, Card } from '@unihub/ui/components'`.

### D3. Per-component subpath exports are NOT introduced (yet)

`@unihub/ui/components` is the single subpath. Per-component subpaths (`@unihub/ui/components/button`) would let consumers tree-shake more aggressively, but:
- Modern bundlers (Vite, esbuild, Rollup via tsup) already tree-shake the barrel correctly because every component is a named export of a pure-ESM module.
- Per-component subpaths balloon `package.json#exports` and complicate `tsup.config.ts`.

Revisit if a future change measures a bundle-size problem.

### D4. Tokens are reached through Tailwind utility classes, not CSS variables or inline styles

A `Button` with `variant="primary"` emits a class string like `bg-primary text-on-primary text-button-md rounded-md px-[18px] py-[10px]`. The Tailwind preset (from Change 1) maps `bg-primary` to `var(--color-primary)`.

**Why**:
- Single source of truth — change a token in `tokens.ts`, the Tailwind preset and CSS-vars file both rebuild; every primitive picks up the new value with no code change.
- Lets app authors override via `className` prop (passed through `clsx`) using familiar Tailwind syntax: `<Button className="w-full" />` works.
- Avoids the dual-source problem of "is the color from the prop or from CSS-vars".

**Alternatives considered**:
- Direct CSS-var consumption (`style={{ background: 'var(--color-primary)' }}`): loses utility-class override path, makes responsive variants painful.
- CSS modules: extra build step, less ergonomic for variants.

### D5. Polymorphic `<Button>` via `asChild` is NOT introduced (yet)

Button supports `href?: string`. When set, it renders `<a>`; when unset, `<button type="button">`. No Radix-style `asChild`.

**Why**: `asChild` is a real footgun source (props composition, ref forwarding edge cases). Buttons in this app render either as buttons or as links — covered. Other primitives don't need polymorphism.

### D6. Focus styles use `:focus-visible` with a primary-colored ring

All interactive primitives get a `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` treatment. This:
- Skips the ring for mouse clicks (avoids the "ring stuck after click" complaint).
- Renders the ring for keyboard / a11y navigation.

A `focus-ring` utility class will be defined in `packages/ui/src/styles/utilities.css` and applied via component classes to keep ring style consistent.

### D7. Accessibility: tab groups own ARIA, individual tabs are dumb

`PillTabGroup` and `SegmentedTabGroup` render `role="tablist"` and inject `aria-selected`, `aria-current` (only `SegmentedTab` for under-line nav), and roving `tabIndex` onto each child `PillTab` / `SegmentedTab`. Children get a `value` prop and an `onClick`; ARIA wiring is centralized.

**Why**: Spreading ARIA across leaf components leaks state and is consistently wrong. The group knows which child is active; only the group is in a position to wire ARIA correctly.

### D8. Tests are colocated and behavior-focused

For each primitive:
- **Render test**: renders without crashing for default variant.
- **Variant smoke test**: every documented variant renders without throwing; class string contains the expected token-bound utility (e.g., `Button variant="primary"` → class string includes `bg-primary`). Asserted via `getByRole(...).className.includes(...)` — NOT toMatchSnapshot, which is too brittle.
- **Disabled test**: `disabled` prop prevents `onClick`; `aria-disabled="true"` is set.
- **Ref test**: refs forward through to the underlying DOM node.
- **Tab a11y test**: `PillTabGroup` sets `aria-selected` correctly when `value` matches.

Use Vitest + `@testing-library/react` + `@testing-library/jest-dom`. Run with `jsdom` env. `vitest.config.ts` for `packages/ui`.

### D9. Component preview surface lives next to TokenPreview

`packages/ui/dev/ComponentPreview.tsx` is added; `dev/main.tsx` introduces a top-level segmented nav: **Tokens** | **Components**. Both pages share the same imports (`fonts.css`, `tokens.css`, the Tailwind setup the dev app already has).

**Why**: One dev server, one URL, easy to compare a token against the component that uses it.

### D10. Build pipeline

`tsup.config.ts` gains `components/index: 'src/components/index.ts'` as a new entry. The build emits `dist/components/index.{js,cjs,d.ts}`. Tree-shaking remains intact because every component file uses only named exports and has no side effects (set `"sideEffects": false` in `package.json` — verify CSS imports are listed under `"sideEffects": ["*.css"]`).

## Risks / Trade-offs

- **Risk**: A primitive's variant set drifts from `DESIGN.md` because someone edits `tokens.ts` but forgets to add a corresponding component variant. → **Mitigation**: Tasks include a checklist mapping every `DESIGN.md` `components:` entry to a test file. Reviewer is expected to walk the checklist.
- **Risk**: Tailwind class strings get long enough to hurt readability. → **Mitigation**: Class maps are stored in `<Component>.types.ts` as plain objects, not inline. Long is OK in a config object; bad in JSX.
- **Risk**: `clsx` and `tailwindcss` peer/transitive deps cause pnpm resolution headaches like the `eslint-plugin-tailwindcss` saga in Change 1. → **Mitigation**: `clsx` has zero deps and a tiny surface; add it as a direct dep of `@unihub/ui`, hoist via `.npmrc` only if necessary.
- **Risk**: Component preview matrix bloats and the dev server slows. → **Mitigation**: Lazy-load per-component sections only when their tab is active. Most primitives are < 50 LOC each, total preview should stay under 500 LOC for now.
- **Trade-off**: No Storybook means no MDX docs, no a11y addon, no story-level navigation. → **Acceptance**: Storybook is a fair amount of config and CI surface; the Vite preview ships in one PR with zero infra cost. We can add Storybook later if usage justifies it.
- **Trade-off**: Hover states are not implemented. → **Acceptance**: Per `DESIGN.md` no-hover policy; app authors can add page-specific hover via `className` override if needed.
