import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface TestimonialCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function TestimonialCard({ children, className, ...rest }: TestimonialCardProps) {
  return (
    <div
      className={cn('bg-canvas rounded-lg p-xxl border border-hairline', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
