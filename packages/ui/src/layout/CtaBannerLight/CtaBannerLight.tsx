import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface CtaBannerLightProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function CtaBannerLight({ children, className, ...rest }: CtaBannerLightProps) {
  return (
    <div
      className={cn('bg-surface text-ink rounded-lg p-section', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
