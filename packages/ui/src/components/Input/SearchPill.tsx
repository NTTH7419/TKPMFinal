import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface SearchPillProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const baseClasses =
  'focus-ring h-[44px] w-full bg-surface text-steel text-body-md rounded-full px-lg py-sm border border-transparent';

export const SearchPill = forwardRef<HTMLInputElement, SearchPillProps>(
  function SearchPill({ className, type = 'search', ...rest }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(baseClasses, className)}
        {...rest}
      />
    );
  },
);
