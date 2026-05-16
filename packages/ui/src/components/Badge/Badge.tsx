import { forwardRef } from 'react';
import { cn } from '../utils/cn';
import { badgeVariantClasses, type BadgeProps } from './Badge.types';

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'purple', className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn('inline-flex items-center', badgeVariantClasses[variant], className)}
      {...rest}
    >
      {children}
    </span>
  );
});
