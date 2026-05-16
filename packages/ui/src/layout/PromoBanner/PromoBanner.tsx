import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface PromoBannerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function PromoBanner({ children, className, ...rest }: PromoBannerProps) {
  return (
    <div
      className={cn('bg-surface text-ink text-body-sm-medium py-sm px-md', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
