import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn';
import { TabsContext, type TabsVariant } from './TabsContext';

interface TabGroupBaseProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
  className?: string;
}

function makeTabGroup(variant: TabsVariant, displayName: string, extraClasses: string) {
  function Group({
    value,
    onValueChange,
    children,
    className,
    onKeyDown,
    ...rest
  }: TabGroupBaseProps) {
    const valuesRef = useRef<string[]>([]);
    const [, force] = useState(0);

    const registerValue = useCallback((v: string) => {
      if (!valuesRef.current.includes(v)) {
        valuesRef.current = [...valuesRef.current, v];
        force((n) => n + 1);
      }
    }, []);

    const ctx = useMemo(
      () => ({
        value,
        onValueChange,
        variant,
        registerValue,
        values: valuesRef.current,
      }),
      [value, onValueChange, registerValue],
    );

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const list = valuesRef.current;
      const idx = list.indexOf(value);
      if (idx === -1) return;
      const nextIdx =
        event.key === 'ArrowRight'
          ? (idx + 1) % list.length
          : (idx - 1 + list.length) % list.length;
      event.preventDefault();
      onValueChange?.(list[nextIdx]);
    };

    return (
      <TabsContext.Provider value={ctx}>
        <div
          role="tablist"
          className={cn('inline-flex items-center', extraClasses, className)}
          onKeyDown={handleKeyDown}
          {...rest}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
  Group.displayName = displayName;
  return Group;
}

export const PillTabGroup = makeTabGroup('pill', 'PillTabGroup', 'gap-xs');
export const SegmentedTabGroup = makeTabGroup(
  'segmented',
  'SegmentedTabGroup',
  'gap-lg border-b border-hairline',
);
