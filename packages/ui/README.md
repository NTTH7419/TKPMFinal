# @unihub/ui

Design-token foundation for the UniHub monorepo. Every color, typeface step, spacing value, and shadow in [DESIGN.md](../../DESIGN.md) lives here as code.

## What's inside

| Path | Purpose |
|---|---|
| `src/tokens/tokens.ts` | Single source of truth for all design tokens |
| `src/tailwind-preset.ts` | Tailwind v3 preset mapping every token to a utility class |
| `src/styles/tokens.css` | CSS variable bundle — generated at build time from `tokens.ts` |
| `src/styles/fonts.css` | Loads Inter Variable (400/500/600) and declares `--font-sans` |
| `dev/TokenPreview.tsx` | Visual token preview (dev server only) |

## Consuming in an app

1. Add the dependency: `"@unihub/ui": "workspace:*"` in the app's `package.json`.
2. Import styles in `main.tsx`:
   ```ts
   import '@unihub/ui/fonts.css';
   import '@unihub/ui/tokens.css';
   ```
3. Add a `tailwind.config.ts`:
   ```ts
   import type { Config } from 'tailwindcss';
   import preset from '@unihub/ui/tailwind-preset';
   export default { presets: [preset], content: ['./index.html', './src/**/*.{ts,tsx}'] } satisfies Config;
   ```
4. Add `postcss.config.cjs` with `tailwindcss` + `autoprefixer`.
5. Add Tailwind directives to the app's root CSS.

## Available exports

| Import | Content |
|---|---|
| `@unihub/ui/tailwind-preset` | Tailwind preset — use in `tailwind.config.ts` |
| `@unihub/ui/tokens` | Raw TS object + TypeScript types (`ColorToken`, etc.) |
| `@unihub/ui/tokens.css` | CSS variables: `--color-*`, `--space-*`, `--rounded-*`, `--shadow-*`, `--text-*` |
| `@unihub/ui/fonts.css` | Font loading + `--font-sans` variable |
| `@unihub/ui/utilities.css` | `.focus-ring` utility for keyboard focus rings |
| `@unihub/ui/components` | Primitive React components (see below) |

## Components

Primitive React components that consume the token preset. All exports are tree-shakeable named exports off `@unihub/ui/components`. Every interactive primitive uses `:focus-visible` for keyboard focus (no rings on mouse click) via the shared `.focus-ring` utility — consuming apps must `import '@unihub/ui/utilities.css'` once.

| Primitive | Variants / API |
|---|---|
| `Button` | `primary` · `dark` · `secondary` · `on-dark` · `secondary-on-dark` · `ghost` · `link`. `disabled`, `href` (renders `<a>`), ref forwards |
| `Card` | `base` · `feature` · 8 pastel tints (`feature-peach` …) · `agent-tile` · `template` · `startup-perk` · `testimonial` |
| `TextInput` | Default text input with `:focus-visible` border-swap to primary |
| `SearchPill` | Surface-tinted pill input |
| `Badge` | Filled (`purple` · `pink` · `orange` · `popular`) + tag (`tag-purple` · `tag-orange` · `tag-green`) |
| `PillTabGroup` + `PillTab` | Pill-style top-level tabs; group owns ARIA + roving tabindex |
| `SegmentedTabGroup` + `SegmentedTab` | Underline tabs; active child gets `aria-current="page"` |

```tsx
import { Button, Card, Badge } from '@unihub/ui/components';
import '@unihub/ui/tokens.css';
import '@unihub/ui/utilities.css';

<Card variant="feature-peach">
  <Badge variant="popular">Popular</Badge>
  <Button variant="primary" href="/sign-up">Get started</Button>
</Card>
```

Run the dev preview (`pnpm --filter @unihub/ui dev`) and switch to the **Components** tab for the full variant matrix.

## Running the dev preview

```bash
pnpm --filter @unihub/ui dev
# Opens at http://localhost:6006 — Tokens / Components tabs
```

## Rebuilding after token changes

```bash
pnpm --filter @unihub/ui build
# Regenerates tokens.css then runs tsup
```

## SemVer policy

- **Adding a token** → bump `minor` version (non-breaking for consumers).
- **Renaming or removing a token** → bump `major` version; document migration in the change proposal.
- Tokens are considered stable once `@unihub/ui` reaches `1.0.0`.
