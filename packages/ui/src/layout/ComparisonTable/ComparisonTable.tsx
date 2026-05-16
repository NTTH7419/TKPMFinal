import type { ReactNode, TableHTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface ComparisonTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children?: ReactNode;
}

export function ComparisonTable({ children, className, ...rest }: ComparisonTableProps) {
  return (
    <table
      className={cn('bg-canvas rounded-md border border-hairline text-body-sm w-full border-collapse', className)}
      {...rest}
    >
      {children}
    </table>
  );
}
