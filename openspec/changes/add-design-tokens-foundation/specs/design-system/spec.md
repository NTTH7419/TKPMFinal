## ADDED Requirements

### Requirement: Token contract source of truth

The system SHALL define every design token specified in [`DESIGN.md`](../../../../../DESIGN.md) (colors, typography, rounded, spacing, elevation) exactly once, in a TypeScript module at `packages/ui/src/tokens/tokens.ts`. All consumers — Tailwind preset, CSS variable bundle, and any direct TS imports — SHALL derive their values from this module. No token value SHALL be hand-duplicated in any other file.

#### Scenario: Every DESIGN.md token is reachable
- **WHEN** a reviewer reads `DESIGN.md` and picks any token under `colors:`, `typography:`, `rounded:`, or `spacing:`
- **THEN** the same token name and value exists in `packages/ui/src/tokens/tokens.ts`
- **AND** the same token is reachable as a Tailwind class (e.g., `bg-brand-navy` for `colors.brand-navy`)
- **AND** the same token is reachable as a CSS variable (e.g., `var(--color-brand-navy)`)

#### Scenario: Duplicate value detection
- **WHEN** CI runs against a PR that introduces a hard-coded hex color anywhere under `packages/ui/src/` (excluding `tokens.ts`) or under `apps/*/src/`
- **THEN** the lint step fails with a message identifying the offending file and line

### Requirement: Tailwind preset distribution

The `@unihub/ui` package SHALL export a Tailwind preset at the subpath `@unihub/ui/tailwind-preset` that maps the token contract onto `theme.extend.colors`, `theme.extend.fontSize`, `theme.extend.fontWeight`, `theme.extend.lineHeight`, `theme.extend.letterSpacing`, `theme.extend.borderRadius`, `theme.extend.spacing`, and `theme.extend.boxShadow`. The preset SHALL disable Tailwind's `preflight` so that adding it to an app does not alter that app's existing visual output.

#### Scenario: Preset imports cleanly into an app
- **WHEN** an app's `tailwind.config.ts` lists `presets: [require('@unihub/ui/tailwind-preset')]`
- **THEN** `pnpm --filter <app> build` succeeds
- **AND** the resulting bundle exposes class utilities for every token name

#### Scenario: Preflight is disabled by default
- **WHEN** the preset is loaded
- **THEN** `corePlugins.preflight` is `false`
- **AND** no Tailwind base reset CSS is emitted unless the consuming app re-enables it

### Requirement: CSS variable bundle

The `@unihub/ui` package SHALL emit a CSS file at `@unihub/ui/tokens.css` that declares every token as a CSS custom property on `:root`. Color tokens SHALL be prefixed `--color-`, typography font sizes `--text-`, font weights `--font-weight-`, line heights `--leading-`, letter spacings `--tracking-`, rounded `--rounded-`, spacing `--space-`, elevation `--shadow-`.

#### Scenario: Variables resolve at runtime
- **WHEN** an app imports `@unihub/ui/tokens.css` and renders an element with `style="background: var(--color-brand-navy)"`
- **THEN** the element's computed background color equals the value of `colors.brand-navy` in `DESIGN.md`

#### Scenario: CSS variable bundle is generated from the same source
- **WHEN** a developer changes a token value in `packages/ui/src/tokens/tokens.ts` and runs the package build
- **THEN** the emitted `tokens.css` reflects the new value without manual edits

### Requirement: Font loading contract

The `@unihub/ui` package SHALL provide an importable stylesheet at `@unihub/ui/fonts.css` that loads the Inter variable font via `@fontsource-variable/inter` (or equivalent local woff2 assets) for weights 400, 500, and 600. It SHALL declare a CSS variable `--font-sans` with value `'Inter Variable', -apple-system, system-ui, 'Segoe UI', Helvetica, sans-serif`. The variable name SHALL NOT use "Notion" since the proprietary Notion-Sans font is not licensed for this project.

#### Scenario: Font variable is set
- **WHEN** an app imports `@unihub/ui/fonts.css`
- **THEN** `getComputedStyle(document.documentElement).getPropertyValue('--font-sans')` resolves to the Inter fallback chain

#### Scenario: Only required weights are loaded
- **WHEN** the package is built
- **THEN** the emitted font asset bundle contains only weights 400, 500, and 600

### Requirement: Token preview surface

The `@unihub/ui` package SHALL ship a local dev server, invoked via `pnpm --filter @unihub/ui dev`, that renders a `/` preview page displaying every color swatch, typography step, rounded value, spacing value, and elevation level by name. The preview page SHALL render using the same token bundle that consumer apps use — no separate hardcoded values.

#### Scenario: Preview renders all tokens
- **WHEN** a reviewer runs `pnpm --filter @unihub/ui dev` and opens the page in a browser
- **THEN** every color, font size, rounded, spacing, and shadow token in `DESIGN.md` is visibly rendered with its name label
- **AND** the rendered values match `DESIGN.md` visually

### Requirement: Apps wire the preset without visual regression

Each of [`apps/admin-web`](../../../../../apps/admin-web/), [`apps/student-web`](../../../../../apps/student-web/), and [`apps/checkin-pwa`](../../../../../apps/checkin-pwa/) SHALL add the preset to its `tailwind.config.ts`, import `@unihub/ui/tokens.css` and `@unihub/ui/fonts.css` in its root CSS entry, and depend on `@unihub/ui` in `package.json`. Adding these wires SHALL NOT change the rendered output of any existing page.

#### Scenario: No visual regression in any app
- **WHEN** the wiring commits are applied to an app
- **THEN** every existing route in that app renders identically to its pre-wiring state, as confirmed by manual smoke test
- **AND** `pnpm -r build` succeeds across the workspace
- **AND** no console errors or warnings related to CSS appear in dev mode

#### Scenario: Preset can be removed cleanly
- **WHEN** a developer reverts the wiring commits for any one app
- **THEN** that app continues to build and render as it did before this change
- **AND** the other two apps are unaffected

### Requirement: Token contract is versioned with the package

The `@unihub/ui` package SHALL expose its current version via `package.json`. Future changes that ADD tokens SHALL bump the minor version; changes that REMOVE or RENAME tokens SHALL bump the major version. The contract SHALL be considered stable for downstream changes (`add-ui-primitives`, etc.) under SemVer expectations.

#### Scenario: Adding a token is non-breaking
- **WHEN** a future change adds a new token entry to `tokens.ts` without modifying existing entries
- **THEN** `@unihub/ui` minor version is incremented
- **AND** no existing consumer build breaks

#### Scenario: Removing a token is breaking
- **WHEN** a future change deletes a token from `tokens.ts`
- **THEN** `@unihub/ui` major version is incremented
- **AND** the change proposal documents the migration path for every consumer
