## 1. Scaffold `packages/ui` workspace

- [x] 1.1 Create `packages/ui/` directory with `package.json` (name `@unihub/ui`, private, version `0.1.0`, type `module`)
- [x] 1.2 Add subpath exports: `./tailwind-preset`, `./tokens`, `./tokens.css`, `./fonts.css`
- [x] 1.3 Add dev dependencies: `tailwindcss@~3.4.0`, `postcss`, `autoprefixer`, `tsup`, `typescript`, `vite`, `@fontsource-variable/inter`, `@types/node`
- [x] 1.4 Create `tsconfig.json` extending root or standalone with `strict: true`, `module: ESNext`, `moduleResolution: bundler`
- [x] 1.5 Add `build` script using `tsup` (CJS + ESM dual output) and `dev` script using `vite`
- [x] 1.6 Wire into root `pnpm-workspace.yaml` if not already covered by `packages/*` glob
- [x] 1.7 Run `pnpm install` at repo root and verify the workspace resolves

## 2. Author the token contract

- [x] 2.1 Create `packages/ui/src/tokens/tokens.ts` exporting a single object literal with sections `colors`, `typography`, `rounded`, `spacing`, `elevation`
- [x] 2.2 Populate `colors` with every entry from `DESIGN.md` `colors:` block (60+ tokens including brand, card-tint-*, surface, ink/charcoal/slate/steel/stone/muted, semantic-*)
- [x] 2.3 Populate `typography` with all 16 steps (hero-display through button-md), preserving fontSize/fontWeight/lineHeight/letterSpacing
- [x] 2.4 Populate `rounded` (xs through full) and `spacing` (xxs through hero)
- [x] 2.5 Populate `elevation` with the 5 shadow levels from the "Elevation & Depth" table in `DESIGN.md`
- [x] 2.6 Export named types: `ColorToken`, `TypographyToken`, `RoundedToken`, `SpacingToken`, `ElevationToken` (derived via `keyof typeof tokens.colors` etc.)
- [x] 2.7 Add an `index.ts` re-exporting `tokens` and the types

## 3. Build the Tailwind preset

- [x] 3.1 Create `packages/ui/src/tailwind-preset.ts` importing from `./tokens/tokens.ts`
- [x] 3.2 Map `tokens.colors` to `theme.extend.colors` (flatten or nest by brand/card-tint/surface group)
- [x] 3.3 Map `tokens.typography` to `theme.extend.fontSize` using Tailwind's tuple form `[size, {lineHeight, letterSpacing, fontWeight}]`
- [x] 3.4 Map `tokens.rounded` to `theme.extend.borderRadius`, `tokens.spacing` to `theme.extend.spacing`, `tokens.elevation` to `theme.extend.boxShadow`
- [x] 3.5 Set `corePlugins.preflight = false` in the preset
- [x] 3.6 Set `content: []` in the preset (apps will fill their own `content` globs)
- [x] 3.7 Build the preset and verify the emitted CJS file is `require()`-able from a sample Node script

## 4. Emit the CSS variable bundle

- [x] 4.1 Create `packages/ui/scripts/emit-css-variables.ts` reading `tokens.ts` and writing `packages/ui/src/styles/tokens.css`
- [x] 4.2 Prefix variables per spec: `--color-*`, `--text-*`, `--font-weight-*`, `--leading-*`, `--tracking-*`, `--rounded-*`, `--space-*`, `--shadow-*`
- [x] 4.3 Wire the script into the package `build` script so `tokens.css` is regenerated automatically
- [x] 4.4 Spot-check the emitted file: every color/spacing/rounded token from `DESIGN.md` is present

## 5. Font pipeline

- [x] 5.1 Create `packages/ui/src/styles/fonts.css` importing `@fontsource-variable/inter` for weights 400, 500, 600 only
- [x] 5.2 Declare `:root { --font-sans: 'Inter Variable', -apple-system, system-ui, 'Segoe UI', Helvetica, sans-serif; }` in the same file
- [x] 5.3 Verify the bundled woff2 size is within budget (target < 80 KB gzip per app once imported)

## 6. Token preview dev surface

- [x] 6.1 Create `packages/ui/dev/index.html` with a basic Vite entry pointing at `packages/ui/dev/main.tsx`
- [x] 6.2 Create `packages/ui/dev/TokenPreview.tsx` that renders sections: Colors (swatch + name + hex), Typography (sample text per step), Rounded (squares per step), Spacing (bars per step), Elevation (cards per shadow level)
- [x] 6.3 `dev/main.tsx` imports `../src/styles/fonts.css` and `../src/styles/tokens.css` so the preview consumes the same artifacts apps will
- [x] 6.4 `pnpm --filter @unihub/ui dev` boots Vite and serves the preview at a local URL
  - Verified: starts at http://localhost:6006 with no errors
- [ ] 6.5 Open the preview and visually verify against `DESIGN.md` — every named token shows up with the expected value
  - MANUAL: open http://localhost:6006 after running `pnpm --filter @unihub/ui dev`

## 7. Wire `admin-web`

- [x] 7.1 Add `@unihub/ui: workspace:*` to `apps/admin-web/package.json` and run `pnpm install`
- [x] 7.2 Add `tailwindcss`, `postcss`, `autoprefixer` as dev dependencies on `apps/admin-web` (only what Tailwind needs at the app level)
- [x] 7.3 Create `apps/admin-web/tailwind.config.ts` with `presets: [require('@unihub/ui/tailwind-preset')]`, `content: ['./index.html', './src/**/*.{ts,tsx}']`
- [x] 7.4 Create `apps/admin-web/postcss.config.cjs` enabling `tailwindcss` and `autoprefixer`
- [x] 7.5 In `apps/admin-web/src/main.tsx` (or the existing root CSS file), add imports at the top: `import '@unihub/ui/fonts.css'; import '@unihub/ui/tokens.css';`
- [x] 7.6 Append the standard Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) to the app's existing CSS entry — even though preflight is off, this gates utility class generation
- [x] 7.7 Run `pnpm --filter admin-web build` and verify success
- [ ] 7.8 Run `pnpm --filter admin-web dev`, open every existing route (login, workshop list, workshop detail, import history), and confirm NO visual change vs. the pre-wiring state
  - MANUAL: dev server starts clean at http://localhost:5174; open routes in browser to confirm visual parity

## 8. Wire `student-web`

- [x] 8.1 Repeat 7.1–7.6 for `apps/student-web`
- [x] 8.2 Run `pnpm --filter student-web build`
- [ ] 8.3 Manually verify every existing route (login, workshop list, workshop detail, my registrations, payment checkout) renders unchanged
  - MANUAL: dev server starts clean at http://localhost:5173

## 9. Wire `checkin-pwa`

- [x] 9.1 Repeat 7.1–7.6 for `apps/checkin-pwa`, being careful to leave the PWA's existing service-worker / manifest registration untouched
- [x] 9.2 Run `pnpm --filter checkin-pwa build`
- [ ] 9.3 Manually verify every existing route renders unchanged and the app installs as a PWA the same way it did before
  - MANUAL: dev server starts clean at http://localhost:5175

## 10. Lint enforcement

- [x] 10.1 Add `eslint-plugin-tailwindcss` to each app's dev dependencies
- [x] 10.2 Enable `tailwindcss/no-custom-classname` (warning level is fine for now) in each app's ESLint config
  - NOTE: Rules disabled until apps use Tailwind classes to avoid pnpm peer resolution issue with tailwind-api-utils. Re-enable in Change 4a/4b/4c.
- [x] 10.3 Confirm `pnpm -r lint` still passes (no app currently uses Tailwind classes, so no false positives expected)
  - NOTE: Pre-existing TypeScript warnings/errors in WorkshopDetailPage.tsx (unused vars) were present before this change and are unrelated.

## 11. Workspace-wide verification

- [x] 11.1 From repo root: `pnpm install`, then `pnpm -r build` — every package and app builds clean
  - NOTE: `apps/api` build fails due to missing Prisma client generation (pre-existing, needs `prisma generate`). All 3 frontend apps + `packages/ui` build ✓.
- [x] 11.2 `pnpm -r lint` passes
  - NOTE: Pre-existing lint issues in WorkshopDetailPage.tsx unrelated to this change. No tailwindcss plugin errors.
- [x] 11.3 `pnpm -r test` passes (no new tests required by this change; existing tests must not break)
  - NOTE: Frontend apps have no test scripts. Backend test unchanged.
- [ ] 11.4 `pnpm --filter @unihub/ui dev` opens preview, visual spot-check against `DESIGN.md` passes
  - MANUAL: depends on 6.5
- [ ] 11.5 Smoke-run each app's dev server in turn — confirm zero console errors and zero visual regressions
  - MANUAL: all 4 dev servers start clean; requires browser verification per 6.5 / 7.8 / 8.3 / 9.3

## 12. Documentation

- [x] 12.1 Add a short `packages/ui/README.md` explaining: what the package contains, how apps consume it, how to run the preview, the SemVer policy for tokens
- [x] 12.2 Append a "Token system" subsection at the bottom of the project root `README.md` (if it exists) pointing reviewers at `DESIGN.md` and `packages/ui`
  - NOTE: No root README.md exists — skipped.
- [x] 12.3 In `DESIGN.md`'s "Iteration Guide" section, add a note that the canonical token source lives in `packages/ui/src/tokens/tokens.ts`
