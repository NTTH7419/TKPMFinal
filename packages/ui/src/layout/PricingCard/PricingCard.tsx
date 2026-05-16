import { cn } from '../../components/utils/cn';
import type { PricingCardProps } from './PricingCard.types';

export function PricingCard({
  tierName,
  price,
  description,
  featureList,
  cta,
  popularBadge,
  featured = false,
  className,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-xxl flex flex-col gap-4',
        featured
          ? 'bg-surface border-2 border-primary'
          : 'bg-canvas border border-hairline',
        className,
      )}
    >
      {popularBadge && <div>{popularBadge}</div>}
      <h3 className="text-heading-4">{tierName}</h3>
      <div className="text-hero-display">{price}</div>
      {description && <p className="text-body-md text-charcoal">{description}</p>}
      <ul className="flex flex-col gap-2 flex-1">
        {featureList.map((item, i) => (
          <li key={i} className="text-body-sm flex items-start gap-2">
            <span aria-hidden="true" className="text-primary mt-0.5">✓</span>
            {item}
          </li>
        ))}
      </ul>
      {cta && <div className="mt-auto pt-4">{cta}</div>}
    </div>
  );
}
