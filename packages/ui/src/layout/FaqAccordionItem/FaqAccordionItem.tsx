import type { ReactNode } from 'react';
import { cn } from '../../components/utils/cn';

interface FaqAccordionItemProps {
  question: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}

export function FaqAccordionItem({
  question,
  children,
  defaultOpen = false,
  onToggle,
  className,
}: FaqAccordionItemProps) {
  return (
    <details
      open={defaultOpen}
      onToggle={(e) => onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      className={cn('bg-canvas rounded-md p-xl border-b border-hairline', className)}
    >
      <summary className="text-heading-5 cursor-pointer list-none">{question}</summary>
      <div className="text-body-md mt-4">{children}</div>
    </details>
  );
}
