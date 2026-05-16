import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface StatRowProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export function StatRow({ children, className, ...rest }: StatRowProps) {
  return (
    <section
      className={cn('bg-surface rounded-lg p-section-sm text-ink', className)}
      {...rest}
    >
      {children}
    </section>
  );
}
