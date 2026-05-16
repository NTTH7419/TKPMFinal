## 1. Package setup

- [x] 1.1 Add `./layout` subpath to `packages/ui/package.json` `exports` mapping to `dist/layout/index.{js,cjs,d.ts}` (place `types` first)
- [x] 1.2 Add new entry `layout/index: 'src/layout/index.ts'` to `packages/ui/tsup.config.ts`
- [x] 1.3 Keep `"sideEffects": ["*.css"]` from Change 2 — no edits needed
- [x] 1.4 Confirm the existing `vitest.config.ts` glob picks up `src/layout/**/*.test.tsx`; update if needed

## 2. HeroBandDark

- [x] 2.1 Create `src/layout/HeroBandDark/HeroBandDark.types.ts` with `HeroBandDarkProps` including slot props `eyebrow?`, `headline`, `subtitle?`, `primaryCta?`, `secondaryCta?`, `decoration?`, `children`, and `className?`
- [x] 2.2 Create `HeroBandDark.tsx` rendering a `<section>` with `bg-brand-navy text-on-dark p-hero` (or equivalent), centered flex column layout, headline at `text-hero-display`, CTA row below subtitle, `children` slot below CTAs
- [x] 2.3 Create `decoration.tsx` exporting a default `<HeroDots />` SVG component (small inline SVG with scattered colored dots matching `DESIGN.md`)
- [x] 2.4 In `HeroBandDark.tsx`, when no `decoration` prop is passed, render `<HeroDots />` absolutely positioned behind content
- [x] 2.5 Create `HeroBandDark.test.tsx`: renders all slots in order; class string contains `bg-brand-navy`; default decoration renders when prop omitted; custom decoration overrides default
- [x] 2.6 Export via `HeroBandDark/index.ts`

## 3. WorkspaceMockupCard

- [x] 3.1 Create `src/layout/WorkspaceMockupCard/WorkspaceMockupCard.tsx` with `forwardRef`, renders a `<div>` with `bg-canvas rounded-lg border border-hairline shadow-mockup` and no interior padding (`children` is the consumer's responsibility)
- [x] 3.2 Test: shadow utility resolves to `--shadow-mockup`; padding is zero; children render inside
- [x] 3.3 Export via `index.ts`

## 4. PricingCard

- [x] 4.1 Create `src/layout/PricingCard/PricingCard.types.ts` with props `tierName`, `price`, `description?`, `featureList: ReactNode[]`, `cta?`, `popularBadge?`, `featured?: boolean`, `className?`
- [x] 4.2 Create `PricingCard.tsx` applying `pricing-card` tokens by default and `pricing-card-featured` tokens (background `surface`, border `2px solid primary`) when `featured` is true
- [x] 4.3 Render structure: `popularBadge` (top), `tierName` heading, `price` large, `description` body, `featureList` as `<ul>`, `cta` at bottom
- [x] 4.4 Test: featured branch resolves to surface background + primary border; default branch resolves to canvas + hairline border; popular badge renders when supplied
- [x] 4.5 Export via `index.ts`

## 5. ComparisonTable + ComparisonRow

- [x] 5.1 Create `src/layout/ComparisonTable/ComparisonTable.tsx` rendering `<table>` with `bg-canvas rounded-md border border-hairline text-body-sm`, accepting children
- [x] 5.2 Create `ComparisonRow.tsx` rendering `<tr>` with `border-b border-hairline-soft` and per-cell padding via a small `td:p-[var(...)]` selector or by requiring the consumer to apply a `<TableCell />` (decide and document)
- [x] 5.3 Test: `getByRole('table')` finds the table element; `getByRole('row')` finds rows; resolved outer border matches `--color-hairline`
- [x] 5.4 Export both via `index.ts`

## 6. FaqAccordionItem

- [x] 6.1 Create `src/layout/FaqAccordionItem/FaqAccordionItem.tsx` rendering `<details>` + `<summary>` + body `<div>`, accepting `question` and `children`
- [x] 6.2 Apply tokens: `bg-canvas rounded-md p-xl border-b border-hairline`. Summary text uses `text-heading-5`; body uses `text-body-md`
- [x] 6.3 Forward `onToggle` from `<details>` to the consumer
- [x] 6.4 Test: click on summary toggles `open` attribute; pressing Enter on focused summary toggles `open`; resolved padding matches `--space-xl`
- [x] 6.5 Export via `index.ts`

## 7. StatRow

- [x] 7.1 Create `src/layout/StatRow/StatRow.tsx` rendering `<section>` with `bg-surface rounded-lg p-section-sm text-ink` and a children slot
- [x] 7.2 Test: resolved background is `--color-surface`; padding is `--space-section-sm`
- [x] 7.3 Export via `index.ts`

## 8. TestimonialCard, LogoWallItem, CtaBannerLight, PromoBanner

- [x] 8.1 Create one file per component under `src/layout/` with corresponding token classes
- [x] 8.2 `TestimonialCard`: `bg-canvas rounded-lg p-xxl border border-hairline`, children slot
- [x] 8.3 `LogoWallItem`: `bg-transparent text-steel text-body-md-medium p-lg`, children slot
- [x] 8.4 `CtaBannerLight`: `bg-surface text-ink rounded-lg p-section`, children slot
- [x] 8.5 `PromoBanner`: `bg-surface text-ink text-body-sm-medium py-sm px-md`, children slot
- [x] 8.6 Test each: resolved background and padding match the token spec; children render inside
- [x] 8.7 Export each via its own `index.ts`

## 9. FooterRegion + FooterLink

- [x] 9.1 Create `src/layout/FooterRegion/FooterRegion.tsx` rendering `<footer>` with `bg-canvas border-t border-hairline text-charcoal text-body-sm py-section px-xxl` and a children slot
- [x] 9.2 Create `FooterLink.tsx` rendering `<a>` with `text-steel text-body-sm py-xxs px-0`, forwarding `href` and other anchor props
- [x] 9.3 Test: FooterRegion renders as `<footer>` with the documented top border; FooterLink renders as `<a>` with the steel text color
- [x] 9.4 Export both via `index.ts`

## 10. Components barrel + build

- [x] 10.1 Create `src/layout/index.ts` re-exporting every layout component and its types as named exports
- [x] 10.2 Run `pnpm --filter @unihub/ui build` and verify `dist/layout/index.{js,cjs,d.ts}` are emitted
- [x] 10.3 Smoke `require('@unihub/ui/layout')` (CJS) and dynamic `import()` (ESM) from a one-shot Node script

## 11. Layout preview dev surface

- [x] 11.1 Update `dev/main.tsx` segmented nav to add a third option **Layout**
- [x] 11.2 Create `dev/LayoutPreview.tsx` lazy-loading sections per component
- [x] 11.3 HeroBandDark section: full-width band with a sample headline, subtitle, two Button instances as CTAs, and a `WorkspaceMockupCard` containing a placeholder gradient
- [x] 11.4 PricingCard section: 4-tier ladder (Free / Plus / Business / Enterprise) with Plus featured; each tier wired with a sample CTA
- [x] 11.5 ComparisonTable section: 6-row × 4-column sample table with realistic feature names
- [x] 11.6 FaqAccordionItem section: 3 questions, first one open by default
- [x] 11.7 StatRow section: 3-stat strip with sample numbers
- [x] 11.8 TestimonialCard / LogoWallItem / CtaBannerLight / PromoBanner sections: one each with placeholder content
- [x] 11.9 FooterRegion section: 4-column footer with FooterLinks under each column
- [ ] 11.10 MANUAL: `pnpm --filter @unihub/ui dev`, open `http://localhost:6006`, click the Layout tab, visually walk every section against `DESIGN.md`

## 12. Lint & type check

- [x] 12.1 `pnpm --filter @unihub/ui lint` passes
- [x] 12.2 `pnpm --filter @unihub/ui exec tsc --noEmit` passes with strict mode
- [x] 12.3 `pnpm --filter @unihub/ui test` passes (every layout component's test file runs green)

## 13. Workspace-wide verification (non-breaking guarantee)

- [ ] 13.1 `pnpm install` at repo root completes clean
- [ ] 13.2 `pnpm -r build` — every package and app builds. `apps/admin-web`, `apps/student-web`, `apps/checkin-pwa` build identically; their bundles should not include any new `@unihub/ui/layout` imports
- [ ] 13.3 `pnpm -r lint` passes
- [ ] 13.4 `pnpm -r test` passes
- [ ] 13.5 MANUAL: start each app's dev server in turn — every existing route renders identical to `main` with zero console errors. By-construction non-breaking check from [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md)

## 14. Documentation

- [x] 14.1 Update `packages/ui/README.md` adding a "Layout" section listing every component, its slots, and a short usage snippet for the hero band
- [x] 14.2 Add a one-paragraph note to the root `README.md` "Design System" section linking to the Layout tab of the preview
- [x] 14.3 Document explicitly that `HeroBandDark`'s default decoration is a placeholder and that app-specific brand art should replace it in Change 4a/4b/4c
