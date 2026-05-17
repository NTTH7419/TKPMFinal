## Why

The three frontend apps (`admin-web`, `student-web`, `checkin-pwa`) currently render without any shared design language — no tokens, no component primitives, no Tailwind config. [`DESIGN.md`](../../../DESIGN.md) specifies a complete Notion-inspired system (colors, typography, spacing, rounded scale, elevation, components), but it lives only as a document. Before any visual refactor can begin, the token layer must exist as code that all three apps can consume.

This change lays that foundation **without touching a single app page**, so visual work can proceed incrementally in later changes with zero risk to in-flight feature development on `build-unihub-workshop`.

## What Changes

- **Build new** `packages/ui` workspace (pnpm) containing the design-token contract, Tailwind preset, global CSS variables, font setup, and a self-contained token-preview route.
- **Build new** `tailwind.preset.ts` exporting the full `DESIGN.md` token map (colors, typography scale, rounded, spacing, elevation/shadow). This is the single source of truth.
- **Build new** CSS variable bundle at `packages/ui/src/styles/tokens.css` mirroring the preset (for consumers that want raw CSS variables instead of Tailwind classes).
- **Build new** font pipeline: load Notion-Sans (Inter-based, served locally as woff2 + Google Fonts fallback) with a documented `--font-sans` chain.
- **Wire** the preset into [`apps/admin-web`](../../../apps/admin-web/), [`apps/student-web`](../../../apps/student-web/), and [`apps/checkin-pwa`](../../../apps/checkin-pwa/) by adding Tailwind + the preset to each app's build pipeline. Apps gain the ability to use tokens but no page is rewritten.
- **Build new** demo route `/__design-tokens` inside `packages/ui` (rendered via a tiny Vite dev server in the package) that previews every swatch, typography step, rounded value, spacing value, and elevation level.
- **Add** capability spec `design-system` defining the token contract, naming rules, and consumer contract that future UI work depends on.
- This change does NOT refactor any existing page or component — the [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md) non-breaking invariant is trivially satisfied.

## Capabilities

### New Capabilities

- `design-system`: Token contract (colors, typography, rounded, spacing, elevation), Tailwind preset distribution, CSS variable distribution, font loading, and the preview surface guaranteeing tokens render as specified in `DESIGN.md`.

### Modified Capabilities

- (None — no behavior change to any existing capability; preset is additive infrastructure.)

## Impact

- **New package**: `packages/ui` (pnpm workspace). Adds `tailwindcss`, `postcss`, `autoprefixer`, `@types/node` to dev dependencies; `packages/ui` itself is published only inside the workspace.
- **Per-app changes**: each of the three apps gains `tailwind.config.ts`, `postcss.config.cjs`, an `@import` of `tokens.css` in its entry CSS, and adds `@unihub/ui` to its `package.json`. No existing markup, route, or logic is touched.
- **Font assets**: woff2 files committed under `packages/ui/src/fonts/` (~200 KB total) or loaded via `@fontsource/inter` — to be decided in `design.md`.
- **Build pipeline**: Vite picks up Tailwind automatically via PostCSS; no Vite config changes beyond CSS entry imports. CI commands unchanged.
- **No runtime impact** on production user flows. Bundle size grows by Tailwind's purged output (~5–10 KB gzip per app) only once an app actually starts using token classes — until then, Tailwind purges everything.
- **Documentation**: links from `DESIGN.md` Iteration Guide point at the new `packages/ui` source of truth.
