import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant =
  | 'base'
  | 'feature'
  | 'feature-peach'
  | 'feature-rose'
  | 'feature-mint'
  | 'feature-lavender'
  | 'feature-sky'
  | 'feature-yellow'
  | 'feature-yellow-bold'
  | 'feature-cream'
  | 'agent-tile'
  | 'template'
  | 'startup-perk'
  | 'testimonial';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  className?: string;
  children?: ReactNode;
}

export const cardVariantClasses: Record<CardVariant, string> = {
  base: 'bg-canvas text-ink rounded-lg p-xl border border-hairline shadow-card',
  feature: 'bg-surface text-ink rounded-lg p-xxl border border-hairline',
  'feature-peach': 'bg-card-tint-peach text-ink rounded-lg p-xxl',
  'feature-rose': 'bg-card-tint-rose text-ink rounded-lg p-xxl',
  'feature-mint': 'bg-card-tint-mint text-ink rounded-lg p-xxl',
  'feature-lavender': 'bg-card-tint-lavender text-ink rounded-lg p-xxl',
  'feature-sky': 'bg-card-tint-sky text-ink rounded-lg p-xxl',
  'feature-yellow': 'bg-card-tint-yellow text-ink rounded-lg p-xxl',
  'feature-yellow-bold': 'bg-card-tint-yellow-bold text-ink rounded-lg p-xxl',
  'feature-cream': 'bg-card-tint-cream text-ink rounded-lg p-xxl',
  'agent-tile': 'bg-canvas text-ink rounded-md p-lg border border-hairline',
  template: 'bg-canvas text-ink rounded-md p-md border border-hairline',
  'startup-perk': 'bg-surface text-ink rounded-md p-lg border border-hairline-soft',
  testimonial: 'bg-canvas text-ink rounded-lg p-xxl border border-hairline',
};
