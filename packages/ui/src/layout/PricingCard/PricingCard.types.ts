import type { ReactNode } from 'react';

export interface PricingCardProps {
  tierName: ReactNode;
  price: ReactNode;
  description?: ReactNode;
  featureList: ReactNode[];
  cta?: ReactNode;
  popularBadge?: ReactNode;
  featured?: boolean;
  className?: string;
}
