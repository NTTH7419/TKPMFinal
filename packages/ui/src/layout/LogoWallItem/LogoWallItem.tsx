import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface LogoWallItemProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function LogoWallItem({ children, className, ...rest }: LogoWallItemProps) {
  return (
    <div
      className={cn('bg-transparent text-steel text-body-md-medium p-lg', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
