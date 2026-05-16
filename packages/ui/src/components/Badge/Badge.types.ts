import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant =
  | 'purple'
  | 'pink'
  | 'orange'
  | 'popular'
  | 'tag-purple'
  | 'tag-orange'
  | 'tag-green';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  className?: string;
  children?: ReactNode;
}

export const badgeVariantClasses: Record<BadgeVariant, string> = {
  purple: 'bg-primary text-on-primary text-caption-bold rounded-full px-md py-xxs',
  pink: 'bg-brand-pink text-on-primary text-caption-bold rounded-full px-md py-xxs',
  orange: 'bg-brand-orange text-on-primary text-caption-bold rounded-full px-md py-xxs',
  popular: 'bg-brand-yellow text-brand-brown text-caption-bold rounded-full px-md py-xxs',
  'tag-purple': 'bg-card-tint-lavender text-brand-purple-800 text-caption rounded-sm px-xs py-xxs',
  'tag-orange': 'bg-card-tint-peach text-brand-orange-deep text-caption rounded-sm px-xs py-xxs',
  'tag-green': 'bg-card-tint-mint text-brand-green text-caption rounded-sm px-xs py-xxs',
};
