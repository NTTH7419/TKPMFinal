import { cn } from '../../components/utils/cn';
import { HeroDots } from './decoration';
import type { HeroBandDarkProps } from './HeroBandDark.types';

export function HeroBandDark({
  eyebrow,
  headline,
  subtitle,
  primaryCta,
  secondaryCta,
  decoration,
  children,
  className,
}: HeroBandDarkProps) {
  const decorationNode = decoration !== undefined ? decoration : <HeroDots />;

  return (
    <section
      className={cn(
        'relative overflow-hidden bg-brand-navy text-on-dark p-hero flex flex-col items-center text-center',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {decorationNode}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 w-full">
        {eyebrow && <div>{eyebrow}</div>}
        <h1 className="text-hero-display">{headline}</h1>
        {subtitle && <p className="text-body-lg">{subtitle}</p>}
        {(primaryCta || secondaryCta) && (
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {primaryCta}
            {secondaryCta}
          </div>
        )}
        {children && <div className="w-full mt-8">{children}</div>}
      </div>
    </section>
  );
}
