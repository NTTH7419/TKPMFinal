import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface FooterRegionProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export function FooterRegion({ children, className, ...rest }: FooterRegionProps) {
  return (
    <footer
      className={cn(
        'bg-canvas border-t border-hairline text-charcoal text-body-sm py-section px-xxl',
        className,
      )}
      {...rest}
    >
      {children}
    </footer>
  );
}
