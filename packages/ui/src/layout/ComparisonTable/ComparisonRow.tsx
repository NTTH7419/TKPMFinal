import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../components/utils/cn';

interface ComparisonRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children?: ReactNode;
}

// Consumer is responsible for supplying <th> and <td> cells.
// Apply p-md px-lg to each cell for the documented token padding.
export function ComparisonRow({ children, className, ...rest }: ComparisonRowProps) {
  return (
    <tr
      className={cn('border-b border-hairline-soft last:border-b-0', className)}
      {...rest}
    >
      {children}
    </tr>
  );
}
