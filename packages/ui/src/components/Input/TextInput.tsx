import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const baseClasses =
  'focus-ring h-[44px] w-full bg-canvas text-ink text-body-md rounded-md px-md py-sm border border-hairline-strong focus-visible:border-primary focus-visible:[border-width:2px] focus-visible:outline-none';

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, type = 'text', ...rest }, ref) {
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
