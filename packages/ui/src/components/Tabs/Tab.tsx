import {
  useContext,
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn';
import { TabsContext, type TabsVariant } from './TabsContext';

interface TabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  children?: ReactNode;
}

const pillBase =
  'focus-ring text-button-md rounded-full px-md py-xs bg-transparent text-ink';
const pillActive = 'bg-ink text-on-dark';

const segmentedBase =
  'focus-ring text-button-md bg-transparent text-steel px-xs py-sm border-b-2 border-transparent';
const segmentedActive = 'text-ink border-b-2 border-ink';

function makeTab(expectedVariant: TabsVariant, displayName: string) {
  function Tab({ value, className, children, onClick, ...rest }: TabProps) {
    const ctx = useContext(TabsContext);
    if (!ctx) {
      throw new Error(`${displayName} must be used within its TabGroup`);
    }
    const { value: activeValue, onValueChange, variant, registerValue } = ctx;

    useEffect(() => {
      registerValue(value);
    }, [registerValue, value]);

    const isActive = activeValue === value;
    const base = expectedVariant === 'pill' ? pillBase : segmentedBase;
    const activeCls = expectedVariant === 'pill' ? pillActive : segmentedActive;

    return (
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-current={
          variant === 'segmented' && isActive ? 'page' : undefined
        }
        tabIndex={isActive ? 0 : -1}
        className={cn(base, isActive && activeCls, className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            onValueChange?.(value);
          }
        }}
        {...rest}
      >
        {children}
      </button>
    );
  }
  Tab.displayName = displayName;
  return Tab;
}

export const PillTab = makeTab('pill', 'PillTab');
export const SegmentedTab = makeTab('segmented', 'SegmentedTab');
