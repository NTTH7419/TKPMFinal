## ADDED Requirements

### Requirement: HeroBandDark renders the signature navy hero layout

The `@unihub/ui/layout` package SHALL export a `HeroBandDark` component implementing the `hero-band-dark` token set: background `--color-brand-navy`, text `--color-on-dark`, padding `--space-hero`. The component SHALL accept slots `eyebrow?`, `headline`, `subtitle?`, `primaryCta?`, `secondaryCta?`, `decoration?`, and `children`. The headline SHALL render at the `hero-display` typography step. Layout SHALL center content horizontally and place the `children` slot directly below the CTA row.

#### Scenario: Hero renders with all slots
- **WHEN** `<HeroBandDark headline="Hi" subtitle="World" primaryCta={…} secondaryCta={…} decoration={…}>{mockup}</HeroBandDark>` is rendered
- **THEN** the root element's resolved background is `--color-brand-navy` and text is `--color-on-dark`
- **AND** the headline element has the `hero-display` typography step applied
- **AND** every supplied slot appears in the rendered output in the expected order (eyebrow, headline, subtitle, CTA row, children)

#### Scenario: Default decoration renders when no decoration prop is passed
- **WHEN** `<HeroBandDark headline="Hi">{children}</HeroBandDark>` is rendered without a `decoration` prop
- **THEN** the default sticky-note-dot SVG decoration is rendered in the band

### Requirement: WorkspaceMockupCard provides a shadowed white surface for product mockups

The `@unihub/ui/layout` package SHALL export a `WorkspaceMockupCard` component implementing the `workspace-mockup-card` token set: background `--color-canvas`, radius `--rounded-lg`, border `1px solid --color-hairline`, shadow `--shadow-mockup`. The component SHALL render any `children` inside the card surface without padding (consumer owns interior layout).

#### Scenario: Shadow and radius are applied
- **WHEN** `<WorkspaceMockupCard>{content}</WorkspaceMockupCard>` is rendered
- **THEN** the rendered element's resolved shadow matches `--shadow-mockup`
- **AND** the resolved radius is `--rounded-lg`
- **AND** the rendered element has zero interior padding

### Requirement: PricingCard renders a single tier with optional featured emphasis

The `@unihub/ui/layout` package SHALL export a `PricingCard` component accepting `tierName`, `price`, `description?`, `featureList` (array of nodes), `cta?` (slot), `popularBadge?` (slot), and `featured?` (boolean). When `featured` is true the component SHALL apply the `pricing-card-featured` token set (background `--color-surface`, border `2px solid --color-primary`); otherwise it SHALL apply `pricing-card` tokens (background `--color-canvas`, border `1px solid --color-hairline`). Both variants SHALL use `--rounded-lg` and `--space-xxl` padding.

#### Scenario: Default tier renders with canvas background and hairline border
- **WHEN** `<PricingCard tierName="Plus" price="$10" featureList={[…]} />` is rendered
- **THEN** the resolved background is `--color-canvas`
- **AND** the resolved border is `1px solid --color-hairline`

#### Scenario: Featured tier swaps to surface background and primary border
- **WHEN** `<PricingCard featured tierName="Business" price="$25" featureList={[…]} />` is rendered
- **THEN** the resolved background is `--color-surface`
- **AND** the resolved border is `2px solid --color-primary`
- **AND** any provided `popularBadge` slot renders inside the card

### Requirement: ComparisonTable and ComparisonRow render an accessible read-only table

The `@unihub/ui/layout` package SHALL export `ComparisonTable` (renders `<table>`) and `ComparisonRow` (renders `<tr>`). `ComparisonTable` SHALL apply the `comparison-table` token set (background `--color-canvas`, typography `body-sm`, radius `--rounded-md`, border `1px solid --color-hairline`). `ComparisonRow` SHALL apply the `comparison-row` token set with a `1px solid --color-hairline-soft` bottom border and `--space-md --space-lg` padding via cell-level styling. The table SHALL preserve semantic `<thead>`, `<tbody>`, `<th>`, and `<td>` elements supplied by the consumer.

#### Scenario: Table renders as a semantic table
- **WHEN** `<ComparisonTable><thead>…</thead><tbody><ComparisonRow>…</ComparisonRow></tbody></ComparisonTable>` is rendered
- **THEN** the rendered root element is a `<table>` node
- **AND** screen-reader detection sees a table with rows and cells (via testing-library `getByRole('table')`)

### Requirement: FaqAccordionItem uses native details/summary for accessibility

The `@unihub/ui/layout` package SHALL export a `FaqAccordionItem` component that renders a `<details>` element with a custom-styled `<summary>` and a body region. The component SHALL accept `question` and `children` (the answer). Default state is collapsed. The component SHALL apply the `faq-accordion-item` token set (background `--color-canvas`, radius `--rounded-md`, padding `--space-xl`, bottom border `1px solid --color-hairline`).

#### Scenario: Clicking summary toggles the open state
- **WHEN** the user clicks the `<summary>` of a `<FaqAccordionItem question="Q">A</FaqAccordionItem>`
- **THEN** the `<details>` element's `open` attribute toggles
- **AND** the answer text becomes visible

#### Scenario: Keyboard activation toggles via Enter
- **WHEN** the `<summary>` has keyboard focus and the user presses Enter
- **THEN** the `<details>` element's `open` attribute toggles (browser default behavior, preserved)

### Requirement: StatRow renders the stats strip surface

The `@unihub/ui/layout` package SHALL export a `StatRow` component implementing the `stat-row` token set: background `--color-surface`, radius `--rounded-lg`, padding `--space-section-sm`, text `--color-ink`. The component SHALL render any `children` inside (consumer supplies stat values, labels, optional chart visualization).

#### Scenario: StatRow applies surface background
- **WHEN** `<StatRow>{content}</StatRow>` is rendered
- **THEN** the resolved background is `--color-surface`
- **AND** the resolved radius is `--rounded-lg`

### Requirement: TestimonialCard, LogoWallItem, CtaBannerLight, PromoBanner render their documented token sets

The `@unihub/ui/layout` package SHALL export the four components named above. `TestimonialCard` SHALL apply `testimonial-card` tokens (canvas background, hairline border, `--rounded-lg`, `--space-xxl` padding). `LogoWallItem` SHALL apply `logo-wall-item` tokens (transparent background, `--color-steel` text, `body-md-medium` typography, `--space-lg` padding). `CtaBannerLight` SHALL apply `cta-banner-light` tokens (surface background, `--color-ink` text, `--rounded-lg`, `--space-section` padding). `PromoBanner` SHALL apply `promo-banner` tokens (surface background, `body-sm-medium` typography, `--space-sm --space-md` padding).

#### Scenario: Each component renders with its documented background
- **WHEN** each of `<TestimonialCard />`, `<LogoWallItem />`, `<CtaBannerLight />`, `<PromoBanner />` is rendered with placeholder content
- **THEN** the resolved background of each matches the corresponding `DESIGN.md` entry
- **AND** the resolved padding and radius (where applicable) match the corresponding entries

### Requirement: FooterRegion and FooterLink render the marketing footer scaffold

The `@unihub/ui/layout` package SHALL export `FooterRegion` (renders a `<footer>` element) and `FooterLink` (renders an `<a>` element). `FooterRegion` SHALL apply the `footer-region` token set (canvas background, charcoal text, `body-sm` typography, `--space-section --space-xxl` padding, top border `1px solid --color-hairline`). `FooterLink` SHALL apply the `footer-link` token set (transparent background, `--color-steel` text, `body-sm` typography, `--space-xxs 0` padding).

#### Scenario: FooterRegion renders as semantic footer
- **WHEN** `<FooterRegion>{columns}</FooterRegion>` is rendered
- **THEN** the rendered root element is a `<footer>` node
- **AND** the resolved top border is `1px solid --color-hairline`

#### Scenario: FooterLink renders as anchor with steel text
- **WHEN** `<FooterLink href="/docs">Docs</FooterLink>` is rendered
- **THEN** the rendered element is an `<a>` with `href="/docs"`
- **AND** the resolved text color is `--color-steel`

### Requirement: Layout components are exported via @unihub/ui/layout subpath

The `@unihub/ui` package SHALL expose a subpath export `@unihub/ui/layout` that re-exports every layout component (`HeroBandDark`, `WorkspaceMockupCard`, `PricingCard`, `ComparisonTable`, `ComparisonRow`, `FaqAccordionItem`, `StatRow`, `TestimonialCard`, `LogoWallItem`, `CtaBannerLight`, `PromoBanner`, `FooterRegion`, `FooterLink`) as named exports. Build SHALL emit both ESM and CJS bundles with type definitions.

#### Scenario: Consumer can import a layout component
- **WHEN** a consuming app writes `import { HeroBandDark } from '@unihub/ui/layout'`
- **THEN** TypeScript resolves `HeroBandDark` to its component type with documented slot props
- **AND** `pnpm --filter <app> build` succeeds with no missing-module error

### Requirement: Layout preview page renders every component with realistic content

The `packages/ui` dev surface at `localhost:6006` SHALL include a Layout page rendering, for every component, at least one instance with realistic placeholder content (headline + subtitle for the hero, 4-tier ladder for pricing, multi-row comparison table, 3-column footer, etc.). The page SHALL be lazy-loaded so the Tokens and Components pages remain fast to first render.

#### Scenario: Layout page renders without console errors
- **WHEN** a developer runs `pnpm --filter @unihub/ui dev` and clicks the Layout tab
- **THEN** the browser console logs zero errors and zero warnings
- **AND** every component enumerated in this spec appears at least once on the page

### Requirement: No frontend application is modified by this change

This change SHALL NOT modify any file under `apps/admin-web/`, `apps/student-web/`, or `apps/checkin-pwa/`. Compliance with [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md) is satisfied by construction.

#### Scenario: Apps build identically before and after
- **WHEN** the change branch is checked out and `pnpm -r build` is run
- **THEN** every app under `apps/*` builds successfully
- **AND** the build artifacts for the three apps differ from `main` only in ways attributable to lockfile hash bumps in `packages/ui`

#### Scenario: Smoke run shows no visual change
- **WHEN** each app's dev server is started after this change lands
- **THEN** every existing route renders identically to its pre-change state
- **AND** the network request profile observed during the golden path is unchanged
