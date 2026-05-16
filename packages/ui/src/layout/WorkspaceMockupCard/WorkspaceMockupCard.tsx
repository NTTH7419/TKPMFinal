import { forwardRef } from 'react';
import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface WorkspaceMockupCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const WorkspaceMockupCard = forwardRef<HTMLDivElement, WorkspaceMockupCardProps>(
  function WorkspaceMockupCard({ children, className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn('bg-canvas rounded-lg border border-hairline shadow-mockup', className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
