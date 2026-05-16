import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../components/utils/cn';

interface FooterLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
}

export function FooterLink({ children, className, ...rest }: FooterLinkProps) {
  return (
    <a
      className={cn('text-steel text-body-sm py-xxs px-0 hover:underline', className)}
      {...rest}
    >
      {children}
    </a>
  );
}
