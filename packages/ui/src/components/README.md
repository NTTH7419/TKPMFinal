# @unihub/ui components

Primitive React components consuming the design tokens shipped from `../tokens/`.

## Class composition: `cn()`

Use `cn()` to compose Tailwind utility classes for variant maps + caller `className` overrides.

```ts
import { cn } from './utils/cn';

<button className={cn('bg-primary text-on-primary focus-ring', className)} />
```

`cn` is a tiny wrapper over `clsx` — no falsy class names, dedupe-friendly.

## Focus ring: `focus-ring` utility

Every interactive primitive applies the `.focus-ring` class from `../styles/utilities.css`. The utility uses `:focus-visible` so mouse clicks do NOT show the ring; only keyboard/programmatic focus does. Consuming apps must import `@unihub/ui/utilities.css` once (alongside `tokens.css`).
