import { forwardRef } from 'react';
import { cn } from '../utils/cn';
import { cardVariantClasses, type CardProps } from './Card.types';

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'base', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariantClasses[variant], className)}
      {...rest}
    >
      {children}
    </div>
  );
});
