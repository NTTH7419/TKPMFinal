## Context

Two changes have shipped before this one:
1. `add-design-tokens-foundation` (archived) — installed `@unihub/ui` with tokens, Tailwind preset (with `preflight: false`), CSS variables, fonts, and a Vite preview at `localhost:6006`.
2. `add-ui-primitives` — added small interactive primitives (Button, Card, Input, Badge, Pill/Segmented tabs) under `@unihub/ui/components`, plus a Components page in the preview.

This change adds the **large composite components** — the marketing-page surfaces that anchor the visual identity in `DESIGN.md`: the navy hero band, the workspace mockup card, the pricing ladder, the FAQ accordion, the footer, etc. They are the difference between "this app has consistent buttons" and "this app feels like the design system".

Like Change 2, this change touches no frontend app. Page-level adoption is deferred to Change 4a/4b/4c.

## Goals / Non-Goals

**Goals:**
- Implement every non-primitive entry in `DESIGN.md` `components:` block as a typed, composable React component.
- Each component is a *layout container* — it owns its structure, padding, background, and shadow, and exposes well-named slots (`children`, `cta`, `headline`, etc.). It does NOT own the page-level data or behavior.
- Components compose primitives from Change 2 where possible (e.g., `HeroBandDark` accepts `Button` instances as `primaryCta` / `secondaryCta` props rather than re-implementing button styling).
- Zero observable change to any running app. No app file is modified.
- Dev preview at `localhost:6006` shows every component in realistic context so designers can sign off before page adoption.

**Non-Goals:**
- Animations or scroll-triggered behavior (hero parallax, fade-ins). Defer to a later change.
- The actual workspace UI mockup illustration. `WorkspaceMockupCard` is a *container*; the illustration that goes inside is page-specific content supplied via `children`.
- Decorative hero sticky-note dots and mesh wires as data-driven illustrations. Ship a *minimal SVG decoration slot* — Change 4a may replace it with brand-specific artwork.
- Marketing-page-style "logo wall" carousel or auto-scroll. `LogoWallItem` is just the cell; the wall layout is a CSS grid the consumer composes.
- Charts inside `StatRow`. Provide a slot; a chart library is a separate decision.
- Dark-mode variants beyond the existing fixed dark surfaces.

## Decisions

### D1. Compositional API: slots, not config

Every layout component exposes named React-node slots, not data-driven props. Example:

```tsx
<HeroBandDark
  eyebrow={<Badge variant="purple">Beta</Badge>}
  headline="Meet the night shift."
  subtitle="The AI that never sleeps."
  primaryCta={<Button variant="primary">Get UniHub free</Button>}
  secondaryCta={<Button variant="secondary-on-dark">Request a demo</Button>}
  decoration={<HeroDots />}
>
  <WorkspaceMockupCard>{/* page-specific illustration */}</WorkspaceMockupCard>
</HeroBandDark>
```

**Why**: Marketing copy varies per app. A config-driven `HeroBandDark` with `headlineSize="80"` and `subtitleColor="#…"` would re-invent React's slot system poorly. Slots accept any node — text, primitive, illustration — and the component owns the layout.

**Alternative considered**: Render-prop / function-as-child. More flexible but rarely needed here; named slots are clearer at the call site.

### D2. HeroBandDark owns its decoration but accepts an override

Default `decoration` renders a small inline-SVG sticky-note-dot pattern that is faithful to `DESIGN.md` ("scattered colorful sticky-note dots and mesh wire illustrations"). Consumers can replace it with a `decoration={<MyArt />}` override.

**Why**: Without a default, every consumer would either render an empty hero or invent their own art on the spot. A safe default lets `apply-design-to-{app}` ship a recognizable hero on day one; brand-specific art ships later.

The default decoration lives in `src/layout/HeroBandDark/decoration.tsx` as a pure React component returning an `<svg>` element. No external asset; no asset pipeline; no bundling complication.

### D3. WorkspaceMockupCard is a container, not an illustration

Renders a `<div>` with `card-base` background, `--rounded-lg` corners, `--color-hairline` 1px border, `--shadow-mockup` shadow, and a `children` slot. The page passes the actual product UI mockup (an image, an iframe of `localhost:5173`, a static React tree — consumer's choice).

**Why**: The library should not embed any product UI; that's the page's concern. The library owns the *frame* (rounded white surface with the dramatic shadow).

### D4. PricingCard composes primitive Card; pricing-specific slots only

`PricingCard` accepts: `tierName`, `price` (string — formatted by the consumer), `description`, `featureList` (array of strings or nodes), `cta` (a Button instance), `popularBadge?` (slot for a `Badge popular` instance). `PricingCardFeatured` is the same component with `featured` prop that swaps to the `pricing-card-featured` token set (background `--color-surface`, 2px primary border).

**Why**: One component, one variant prop. Avoids duplication. Type union keeps `featured` opt-in.

### D5. FaqAccordionItem uses native `<details>`/`<summary>`

For accessibility and zero JS state, the accordion is a `<details>` element with a custom-styled `<summary>` and a body `<div>`. Keyboard support, screen-reader announcements, and Enter-to-toggle are all free from the browser.

**Why**: An accordion is a textbook case where rolling our own state machine adds bugs without adding capability. `<details>` is well-supported and accessible by default.

**Trade-off**: Animating the open/close transition is harder with `<details>` than with a controlled component. Per Non-Goals, animation is deferred — when we want it, we add `[data-state="open"]` and a small JS controller, but only then.

### D6. ComparisonTable is a thin wrapper over a real `<table>`

`<ComparisonTable>` renders `<table role="table">` with `--rounded-md` corners and `--color-hairline` 1px outer border. `<ComparisonRow>` renders `<tr>`. The consumer supplies `<th>` and `<td>` cells.

**Why**: A real `<table>` is the right element semantically. The component contributes the *styling*; cells are the consumer's content.

### D7. FooterRegion accepts column children; does not enumerate links

`<FooterRegion>` is a flex/grid container with `--space-section --space-xxl` padding and a top hairline. Columns are `<div>` children supplied by the consumer. `<FooterLink>` is the styled `<a>` for individual links.

**Why**: Marketing-page footers have a known layout pattern (6-column desktop, 3-column tablet, accordion mobile per `DESIGN.md`) but the *link list itself* is app-specific and may even be data-driven (CMS). The library owns the frame; the app owns the content.

### D8. Layout components live under `@unihub/ui/layout`

New subpath, parallel to `@unihub/ui/components`. Same export-conventions (named exports, `sideEffects: false` except CSS, dual ESM+CJS via tsup).

**Why**: Discoverability — a reader knows that `@unihub/ui/components` is small interactive primitives and `@unihub/ui/layout` is big page surfaces. Keeps tree-shaking straightforward.

### D9. Tests focus on contract, not pixel-perfection

For each component:
- **Renders**: smoke test, no error.
- **Token application**: a class-string contains the documented token utility (e.g., `HeroBandDark` class includes `bg-brand-navy` and `text-on-dark`).
- **Slot test**: passing `<div data-testid="x" />` into a slot renders that node where the slot expects.
- **Accordion-specific**: `FaqAccordionItem` toggles `open` attribute when the `<summary>` is clicked.

No visual regression tests in this change. The dev preview is the manual sign-off surface.

### D10. The dev preview's Layout page lazy-loads heavy sections

The Layout page can grow large (a hero, a footer, a pricing ladder all in one mount). Use `React.lazy` per section so the Tokens / Components pages load fast and Layout content is hydrated only when the tab is opened.

**Why**: Keeps the dev surface responsive even as it accumulates components.

## Risks / Trade-offs

- **Risk**: A component embeds opinions that page authors cannot easily override (e.g., `HeroBandDark` hard-codes its decoration positioning). → **Mitigation**: every component documents which props are slots and accepts a `className` passthrough applied through `cn()`. If a consumer needs to override layout, they replace the whole component, not patch it.
- **Risk**: The default `HeroBandDark` decoration looks generic and gets adopted as the production decoration in every app. → **Mitigation**: README explicitly calls out the default as a placeholder; Change 4a/4b/4c task lists each include "replace HeroBandDark default decoration with app-specific brand art if applicable".
- **Risk**: `WorkspaceMockupCard`'s deep shadow is visually heavy and clashes if used outside a navy hero. → **Mitigation**: Component documentation specifies it is designed for placement on dark surfaces. The preview shows it both on navy (intended use) and on light (cautionary example).
- **Risk**: `<details>` for the accordion doesn't allow controlled state for analytics ("accordion opened" event). → **Mitigation**: Component exposes `onToggle` (forwarded from `<details>`). If analytics needs more, a controlled variant can be added later — not in this change.
- **Risk**: `ComparisonTable` becomes the de facto data-table component and grows responsibilities (sorting, filtering). → **Mitigation**: README scopes it to read-only marketing-page comparison; richer tables will require a separate decision (likely TanStack Table) and a separate spec.
- **Trade-off**: Slot-based APIs require consumers to import both `@unihub/ui/components` (for `Button`, `Badge`) and `@unihub/ui/layout` (for `HeroBandDark`, `PricingCard`). → **Acceptance**: One extra import line for clarity at the call site is a good trade.
