## ADDED Requirements

### Requirement: Button primitive renders every variant from DESIGN.md

The `@unihub/ui/components` package SHALL export a `Button` component supporting variants `primary`, `dark`, `secondary`, `on-dark`, `secondary-on-dark`, `ghost`, and `link`. Each variant SHALL resolve to the token combination documented for the corresponding `button-*` entry in `DESIGN.md` (background color, text color, typography step, rounded radius, padding). The component SHALL render as `<button type="button">` by default and as `<a>` when an `href` prop is provided.

#### Scenario: Primary variant maps to documented tokens
- **WHEN** a developer renders `<Button variant="primary">Click</Button>`
- **THEN** the rendered element has a class string that resolves the background to `--color-primary`, text to `--color-on-primary`, font to the `button-md` typography step, radius to `--rounded-md`, and padding to `10px 18px`

#### Scenario: Every variant renders without throwing
- **WHEN** the component preview matrix renders one `<Button>` per documented variant
- **THEN** no React warning or runtime error is logged
- **AND** every variant's resolved background/text color matches the matching `DESIGN.md` entry on a visual spot-check at `localhost:6006`

#### Scenario: Href renders as anchor
- **WHEN** a developer renders `<Button href="/foo" variant="secondary">Go</Button>`
- **THEN** the rendered DOM node is an `<a>` element with `href="/foo"`
- **AND** the same variant token mapping applies

### Requirement: Button disabled state prevents activation and is announced

A `Button` with `disabled={true}` SHALL NOT invoke its `onClick` handler when clicked or activated via keyboard. The DOM node SHALL carry `aria-disabled="true"`. The visual state SHALL use the `button-primary-disabled` tokens from `DESIGN.md` (background `--color-hairline`, text `--color-muted`).

#### Scenario: Click handler is not called when disabled
- **WHEN** `<Button disabled onClick={fn}>` is rendered and the user clicks it
- **THEN** `fn` is not invoked
- **AND** the rendered element has `aria-disabled="true"`

### Requirement: Card primitive renders every variant from DESIGN.md

The `@unihub/ui/components` package SHALL export a `Card` component supporting variants `base`, `feature`, `feature-peach`, `feature-rose`, `feature-mint`, `feature-lavender`, `feature-sky`, `feature-yellow`, `feature-yellow-bold`, `feature-cream`, `agent-tile`, `template`, `startup-perk`, and `testimonial`. Each variant SHALL resolve to the background color, padding, rounded radius, and border combination documented for the matching `card-*` entry in `DESIGN.md`. Children SHALL render inside the card surface.

#### Scenario: Feature-peach variant maps to documented tokens
- **WHEN** a developer renders `<Card variant="feature-peach">…</Card>`
- **THEN** the rendered element's class string resolves background to `--color-card-tint-peach`, radius to `--rounded-lg`, and padding to `--space-xxl`

#### Scenario: Every documented card variant is exported
- **WHEN** every variant string from the proposal is passed to `<Card variant={…} />`
- **THEN** the component renders without throwing for each
- **AND** the variant's TypeScript type is assignable to the `CardVariant` union

### Requirement: Input primitive exposes text-input and search-pill

The `@unihub/ui/components` package SHALL export a `TextInput` component implementing the `text-input` spec (height 44px, border `1px solid --color-hairline-strong`, radius `--rounded-md`, padding `--space-sm --space-md`). On focus the border SHALL switch to `2px solid --color-primary` per `text-input-focused`. The package SHALL also export a `SearchPill` component implementing the `search-pill` spec (background `--color-surface`, text `--color-steel`, same height/radius).

#### Scenario: TextInput shows focused border on focus
- **WHEN** the user focuses a `<TextInput />` via keyboard
- **THEN** the element matches `:focus-visible`
- **AND** the resolved border switches from `--color-hairline-strong` to `--color-primary` with width 2px

#### Scenario: SearchPill renders with surface background
- **WHEN** `<SearchPill placeholder="Search" />` is rendered
- **THEN** the element's resolved background is `--color-surface` and text color is `--color-steel`

### Requirement: Badge primitive supports filled and tag variants

The `@unihub/ui/components` package SHALL export a `Badge` component supporting filled variants (`purple`, `pink`, `orange`, `popular`) using `--rounded-full` radius and `--text-caption-bold` typography, and tag variants (`tag-purple`, `tag-orange`, `tag-green`) using `--rounded-sm` radius. Each variant SHALL map to the matching `badge-*` entry in `DESIGN.md`.

#### Scenario: Filled badge uses full radius
- **WHEN** `<Badge variant="purple">New</Badge>` is rendered
- **THEN** the resolved background is `--color-primary`, text is `--color-on-primary`, and radius is `--rounded-full`

#### Scenario: Tag badge uses small radius and soft tint
- **WHEN** `<Badge variant="tag-green">Active</Badge>` is rendered
- **THEN** the resolved background is `--color-card-tint-mint`, text is `--color-brand-green`, and radius is `--rounded-sm`

### Requirement: PillTabGroup and SegmentedTabGroup own ARIA wiring for their children

The `@unihub/ui/components` package SHALL export `PillTabGroup` + `PillTab` and `SegmentedTabGroup` + `SegmentedTab`. The group component SHALL render `role="tablist"` and inject `aria-selected`, roving `tabIndex`, and (for segmented tabs) `aria-current="page"` onto each child whose `value` prop matches the group's `value` prop. Individual `PillTab` / `SegmentedTab` children SHALL NOT independently manage these ARIA attributes.

#### Scenario: Active pill tab is announced as selected
- **WHEN** `<PillTabGroup value="b"><PillTab value="a">A</PillTab><PillTab value="b">B</PillTab></PillTabGroup>` is rendered
- **THEN** the tab labeled "B" has `aria-selected="true"` and `tabIndex={0}`
- **AND** the tab labeled "A" has `aria-selected="false"` and `tabIndex={-1}`

#### Scenario: Segmented active tab uses ink underline
- **WHEN** `<SegmentedTabGroup value="x">` with a matching child is rendered
- **THEN** the active child's resolved bottom border is `2px solid --color-ink`
- **AND** the active child has `aria-current="page"`

### Requirement: All interactive primitives use :focus-visible for keyboard focus rings

Every interactive primitive (`Button`, `TextInput`, `SearchPill`, `PillTab`, `SegmentedTab`) SHALL render a `--color-primary` focus ring only when matched by `:focus-visible`. Mouse-click focus SHALL NOT show the ring. The ring SHALL use the shared `focus-ring` utility class defined in `packages/ui/src/styles/utilities.css`.

#### Scenario: Tab key focus shows ring
- **WHEN** the user navigates to any interactive primitive via the Tab key
- **THEN** the primitive matches `:focus-visible`
- **AND** a 2px ring in `--color-primary` is rendered with a 2px offset

#### Scenario: Mouse click does not show ring
- **WHEN** the user clicks any interactive primitive with the mouse
- **THEN** the primitive does not match `:focus-visible`
- **AND** no focus ring is rendered

### Requirement: Primitives are exported via @unihub/ui/components subpath

The `@unihub/ui` package SHALL expose a new subpath export `@unihub/ui/components` that re-exports every primitive (`Button`, `Card`, `TextInput`, `SearchPill`, `Badge`, `PillTab`, `PillTabGroup`, `SegmentedTab`, `SegmentedTabGroup`) as named exports. The build SHALL emit both ESM and CJS bundles plus type definitions. `react` and `react-dom` SHALL be declared as peer dependencies.

#### Scenario: Consumer can import a primitive
- **WHEN** a consuming app writes `import { Button } from '@unihub/ui/components'`
- **THEN** TypeScript resolves `Button` to its component type with `variant` autocompleted to the documented union
- **AND** `pnpm --filter <app> build` succeeds with no missing-module error

### Requirement: Component preview surface renders every variant matrix

The `packages/ui` dev surface at `localhost:6006` SHALL include a Components page rendering, for every primitive, one instance per variant (and per state where applicable: default / pressed / disabled for Button; default / focused for inputs; default / active for tabs). The page SHALL share its CSS-variable + Tailwind setup with the existing Tokens page so visual output reflects what consuming apps will get.

#### Scenario: Components page renders without console errors
- **WHEN** a developer runs `pnpm --filter @unihub/ui dev` and navigates to the Components page
- **THEN** the browser console logs zero errors and zero warnings
- **AND** every variant enumerated in this spec appears at least once on the page

### Requirement: No frontend application is modified by this change

This change SHALL NOT modify any file under `apps/admin-web/`, `apps/student-web/`, or `apps/checkin-pwa/`. Compliance with [`UI_REFACTOR_PRINCIPLES.md`](../../UI_REFACTOR_PRINCIPLES.md) is satisfied by construction.

#### Scenario: Apps build identically before and after
- **WHEN** the change branch is checked out and `pnpm -r build` is run
- **THEN** every app under `apps/*` builds successfully
- **AND** the build artifacts for `apps/admin-web`, `apps/student-web`, `apps/checkin-pwa` differ from `main` only in ways attributable to lockfile hash bumps in `packages/ui` (no JSX, no CSS, no page-level diff)

#### Scenario: Smoke run shows no visual change
- **WHEN** each app's dev server is started after this change lands
- **THEN** every existing route renders identically to its pre-change state
- **AND** the network request profile observed during the golden path is unchanged
