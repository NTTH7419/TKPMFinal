## Why

`add-design-tokens-foundation` shipped tokens; `add-ui-primitives` ships small interactive primitives (Button, Card, Input, Badge, Tabs). What is still missing is the **larger, opinionated layout and signature components** that anchor `DESIGN.md` — the deep navy hero band, the embedded workspace mockup card with the dramatic drop shadow, the pricing tier ladder, the FAQ accordion, the stats strip, the testimonial slate, the footer region. Without these, `apply-design-to-{app}` (Change 4a/4b/4c) page authors will be left to assemble heroes and footers from raw `<div>`s every time — guaranteed drift from the design.

This change ships those large composites as a `@unihub/ui/layout` export. **No frontend app is touched.** All components are previewed in the existing dev surface at `localhost:6006`, joining the Components page introduced in Change 2.

## What Changes

- Add a new `packages/ui/src/layout/` directory housing the composite components, each colocated with `.types.ts`, `.test.tsx`, and a story block in the preview app.
- Implement the following layout/signature components (lifted directly from `DESIGN.md` `components:` block — these are explicitly the non-primitive entries):
  - **HeroBandDark**: deep navy hero band (`hero-band-dark` spec). Accepts headline, subtitle, primary CTA, secondary CTA, decoration slot, and a children slot for the workspace mockup. Renders the centered marketing-hero layout from `DESIGN.md`.
  - **WorkspaceMockupCard**: the white workspace UI surface (`workspace-mockup-card` spec) with the deep diffuse shadow (`--shadow-mockup`). Pure container component — does not embed any actual product UI.
  - **PricingCard** + **PricingCardFeatured**: the 4-tier pricing tile (`pricing-card` + `pricing-card-featured`). Composes the existing `Card` primitive's container behavior with the price/feature-list slots specific to pricing.
  - **ComparisonTable** + **ComparisonRow**: the dense pricing comparison table (`comparison-table` + `comparison-row`).
  - **FaqAccordionItem**: single accordion entry (`faq-accordion-item`); composes `<details>`/`<summary>` for native a11y.
  - **StatRow**: the stats strip with optional bar-chart slot (`stat-row`).
  - **TestimonialCard**: the customer testimonial slate (`testimonial-card`). Slots: quote, attribution, optional avatar/logo.
  - **LogoWallItem**: customer logo wordmark cell (`logo-wall-item`).
  - **CtaBannerLight**: light surface CTA banner (`cta-banner-light`).
  - **PromoBanner**: thin promo strip above the top nav (`promo-banner`).
  - **FooterRegion** + **FooterLink**: multi-column light footer (`footer-region` + `footer-link`).
- Export every component via a new `@unihub/ui/layout` subpath. The barrel re-exports all components as named exports.
- Extend `dev/main.tsx` nav to add a third page **Layout**, joining **Tokens** and **Components**. Each component gets a section in `dev/LayoutPreview.tsx` with realistic placeholder content (lorem-style copy + colored squares for images) so reviewers can spot-check against `DESIGN.md`.
- Vitest + RTL unit tests assert: each component renders, the documented tokens are applied (class-string contains expected utility), key slots accept children, and accordion items toggle correctly.
- **No app modifications.** No changes to `apps/admin-web`, `apps/student-web`, `apps/checkin-pwa`. Non-breaking guarantee from [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md) is satisfied by construction.

## Capabilities

### New Capabilities
(none — this change extends the existing `design-system` capability introduced by `add-design-tokens-foundation`)

### Modified Capabilities
- `design-system`: Adds requirements covering layout and signature composite components, the `@unihub/ui/layout` export surface, and the dev preview's Layout page. The primitive-level requirements from `add-ui-primitives` are untouched.

## Impact

- **Code added**: `packages/ui/src/layout/**` (new directory with 11+ component subfolders), `packages/ui/dev/LayoutPreview.tsx` (new), assets-as-CSS for decorative dots on the hero band (small inline SVG strings — no image binaries).
- **Code modified**: `packages/ui/package.json` (one new subpath export `./layout`), `packages/ui/tsup.config.ts` (one new entry `layout/index`), `packages/ui/dev/main.tsx` (one new top-level tab), `packages/ui/README.md` (a Layout section).
- **Apps**: Untouched. `apps/admin-web`, `apps/student-web`, `apps/checkin-pwa` keep identical bundles. `pnpm -r build` shows no diff in their `dist/` beyond lockfile-hash noise.
- **Dependencies**: No new runtime deps — the layout layer composes the primitives from Change 2 and Tailwind utilities. Decorative SVGs are inline strings, no asset pipeline.
- **Tests**: New unit suite under `packages/ui/src/layout/**/*.test.tsx`.
- **Risk**: Very low. Library is unused by any running app until Change 4a/4b/4c lands. The largest risk is misreading a `DESIGN.md` entry; the dev preview and unit tests are the safety net.
