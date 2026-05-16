## Context

The monorepo currently has three React + Vite apps (`apps/admin-web`, `apps/student-web`, `apps/checkin-pwa`) and one shared package (`packages/shared`) holding DTOs/enums/constants. No styling primitives exist — pages render with browser defaults. Meanwhile [`DESIGN.md`](../../../DESIGN.md) specifies a full Notion-inspired token system with ~60 color tokens, 16 typography steps, 8 rounded values, 14 spacing values, 5 elevation levels, and ~40 components.

This change is the foundation of a 4-step roadmap (see [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md) scope section). Subsequent changes (`add-ui-primitives`, `add-layout-and-signature-components`, `apply-design-to-{app}`) all depend on the artifact this change produces.

Stakeholder constraints:

- The current `build-unihub-workshop` work is in flight; this change must not block or destabilize it.
- All three apps share a build cadence and a single `pnpm` workspace.
- No frontend tests exist yet beyond what `vitest` ships with the Vite template.

## Goals / Non-Goals

**Goals:**

- One **single source of truth** for design tokens, consumable by all three apps and any future package.
- Apps can opt in to the token system **incrementally** — adding the preset must not change how any existing page looks.
- Zero hand-typed color hex codes in app code going forward; every value is reachable as either a Tailwind class (`bg-brand-navy`) or a CSS variable (`var(--color-brand-navy)`).
- A working preview surface (rendered locally) that any reviewer can open to verify tokens match `DESIGN.md`.
- The token contract is enforceable: changing a token name in code without updating the spec is a lint failure.

**Non-Goals:**

- No component primitives (`Button`, `Card`, etc.) — that is `add-ui-primitives` (Change 2).
- No layout/signature components (`HeroBandDark`, `WorkspaceMockupCard`, etc.) — that is Change 3.
- No app page refactors — that is Change 4a/4b/4c.
- No dark mode tokens — `DESIGN.md` lists this as a "Known Gap"; deferred.
- No animation/motion tokens — also a documented gap.
- No Storybook installation in this change (decision below; possibly later).

## Decisions

### D1. Tailwind CSS over CSS Modules / vanilla-extract / styled-components

**Choice**: Tailwind v3.x with a custom preset that maps the `DESIGN.md` token tree onto `theme.extend`.

**Rationale**:

- Existing Vite templates wire Tailwind via PostCSS with one config file per app — minimal infrastructure.
- Tailwind purges unused classes; until apps actually use tokens, bundle impact is near-zero (the non-breaking guarantee from `UI_REFACTOR_PRINCIPLES.md` holds).
- Token tree is naturally expressed as a JS object, so `tailwind.preset.ts` IS the contract — no second source of truth.
- Future component package (`add-ui-primitives`) can compose tokens via class strings, keeping React components plain.

**Alternatives considered**:

- *CSS Modules + raw CSS variables*: cleaner separation but loses utility ergonomics; every component re-declares variants in CSS.
- *vanilla-extract*: type-safe but introduces a non-trivial build step into Vite for every package.
- *styled-components / emotion*: runtime cost, SSR complexity (irrelevant today but limits future Next.js migration), and no purging.

### D2. Tokens defined in TypeScript, mirrored to CSS variables at build time

**Choice**: A single `packages/ui/src/tokens/tokens.ts` exports a plain object literal. Two build outputs:

1. `tailwind.preset.ts` consumes the object and emits the Tailwind theme.
2. A tiny build script (`scripts/emit-css-variables.ts`) writes `packages/ui/src/styles/tokens.css` with `:root { --color-...: ...; ... }`.

**Rationale**:

- Components that want Tailwind classes: `bg-brand-navy`.
- Components / inline styles / chart libraries that need raw values: `var(--color-brand-navy)`.
- Both flow from one TS file — no drift.
- The emit step is dumb (no abstraction) so reviewers can read it in one sitting.

**Alternatives considered**:

- *Style Dictionary*: industry-standard but heavyweight and not needed at this scale.
- *Tailwind plugin that injects CSS vars*: works but couples consumers to Tailwind even when they want raw vars (e.g., a Recharts color prop).

### D3. Font strategy: `@fontsource/inter` as Notion-Sans fallback; no custom Notion-Sans woff2

**Choice**: Install `@fontsource/inter` (variable font). Set `--font-sans` to `'Inter Variable', -apple-system, system-ui, 'Segoe UI', Helvetica, sans-serif`. The CSS variable is named `--font-sans` (not `--font-notion-sans`) to keep the token honest about what we are actually loading.

**Rationale**:

- Notion-Sans is Notion's proprietary fork of Inter; we do not have a license to ship it. Inter is the documented fallback in `DESIGN.md` itself.
- `@fontsource/inter` ships woff2 with subset support and integrates with Vite without CDN dependency.
- Naming `--font-sans` instead of `--font-notion-sans` avoids implying we have the real font.

**Alternatives considered**:

- *Google Fonts CDN*: adds a network dependency and FOUT we cannot easily control.
- *Custom Notion-Sans files*: legally unsafe.

### D4. Demo surface: a standalone Vite dev page inside `packages/ui`, not Storybook

**Choice**: `packages/ui` ships a `dev` script that boots a tiny Vite dev server pointing at `packages/ui/dev/index.html`, which renders `<TokenPreview />`. Access: `pnpm --filter @unihub/ui dev`.

**Rationale**:

- Storybook is ~300 MB of dependencies and a meaningful build-config commitment for a 1-page preview.
- The team will not need Storybook until Change 2 (ui-primitives) introduces many components with stateful variants — defer that decision.
- A single Vite page is enough to satisfy "demo page hiển thị đúng tokens" from the change brief.

**Alternatives considered**:

- *Storybook*: deferred to Change 2; revisit if needed.
- *A demo route inside one of the apps*: pollutes app routing for a dev-only concern.

### D5. Package name and exports

**Choice**: Package name `@unihub/ui` (matches existing `@unihub/shared`). Exports:

- `@unihub/ui/tailwind-preset` → the preset object.
- `@unihub/ui/tokens` → the TS token object (for non-Tailwind consumers).
- `@unihub/ui/tokens.css` → the CSS variable bundle.
- `@unihub/ui/fonts.css` → loads `@fontsource/inter` and declares `--font-sans`.

Apps import `@unihub/ui/tokens.css` and `@unihub/ui/fonts.css` once in their root CSS entry; their `tailwind.config.ts` lists `presets: [require('@unihub/ui/tailwind-preset')]`.

**Rationale**: explicit subpath exports keep tree-shaking obvious and let consumers pick only what they need.

### D6. Where the spec lives

**Choice**: Capability spec at `openspec/changes/add-design-tokens-foundation/specs/design-system/spec.md`. After this change ships, OpenSpec archiving will promote it to a top-level spec location per the existing project workflow.

### D7. Lint/enforcement (minimal)

**Choice**: Add a single `eslint-plugin-tailwindcss` rule (`tailwindcss/no-custom-classname`) to each app's ESLint config so that arbitrary class names that don't resolve against the preset are flagged. Don't add a custom AST checker yet.

**Rationale**: catches typos like `bg-brand-navvy` without a custom toolchain.

## Risks / Trade-offs

- **[Risk]** Tailwind preset drift from `DESIGN.md` over time. **Mitigation**: the capability spec's "Token contract" scenario asserts every token listed in `DESIGN.md` is reachable; manual review on PRs touching `tokens.ts` is required.
- **[Risk]** Installing Tailwind into apps could affect existing styles via Tailwind's preflight (CSS reset). **Mitigation**: set `corePlugins.preflight = false` in each app's `tailwind.config.ts` so preflight does NOT run until that app is explicitly refactored. This is the key knob that makes this change non-breaking.
- **[Risk]** `@fontsource/inter` increases bundle by ~50 KB per app. **Mitigation**: load only the weights actually listed in `DESIGN.md` (400, 500, 600). Tree-shake unused weights.
- **[Trade-off]** Using `@unihub/ui/tailwind-preset` (CommonJS path) means the preset must be CJS-compatible. The package ships dual builds via `tsup` — adds one dev dependency.
- **[Trade-off]** No dark mode tokens now means each later change may need a small extension if dark mode lands. Accepted; documented in `DESIGN.md` known gaps.
- **[Risk]** Adding Tailwind to a Vite app with existing `index.css` can clobber it if PostCSS misorders imports. **Mitigation**: `tokens.css` and `fonts.css` are imported BEFORE Tailwind's directives, and each app's existing `index.css` keeps its current contents at the top.

## Migration Plan

This change is purely additive:

1. Create `packages/ui` and write tokens + preset + CSS emit script.
2. Build `packages/ui` once and verify the emitted `tokens.css` matches expectations.
3. Add Tailwind + preset wiring to one app first (`admin-web`, lowest user impact) and confirm the build still passes and no visual change is observable on existing pages.
4. Repeat for `student-web`, then `checkin-pwa`.
5. Verify `pnpm --filter @unihub/ui dev` opens the token preview locally.

Rollback: each app's wiring is a 3-file diff (`tailwind.config.ts`, `postcss.config.cjs`, one `import` in `index.css` + one line in `package.json`). Reverting any single app is mechanical. The `packages/ui` workspace can stay; it has no consumers if every app reverts.

## Open Questions

- Should `packages/ui` ship its own `tsconfig.json` extending a root one, or define its own? — Lean toward extending a future root `tsconfig.base.json`; if none exists, ship a standalone.
- Do we want to lock Tailwind to v3.4.x specifically? — Yes, v3 is the last version without the upcoming v4 engine; v4 changes preset semantics. Pin via `"tailwindcss": "~3.4.0"`.
- Whether to seed any "alias tokens" (e.g., `--color-page-bg` → `--color-canvas`) now or wait until Change 2 surfaces concrete needs. — Defer to Change 2.
