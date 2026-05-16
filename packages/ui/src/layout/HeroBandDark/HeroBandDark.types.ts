import type { ReactNode } from 'react';

export interface HeroBandDarkProps {
  eyebrow?: ReactNode;
  headline: ReactNode;
  subtitle?: ReactNode;
  primaryCta?: ReactNode;
  secondaryCta?: ReactNode;
  decoration?: ReactNode;
  children?: ReactNode;
  className?: string;
}
