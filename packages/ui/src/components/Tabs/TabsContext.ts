import { createContext } from 'react';

export type TabsVariant = 'pill' | 'segmented';

export interface TabsContextValue {
  value: string;
  onValueChange?: (value: string) => void;
  variant: TabsVariant;
  registerValue: (value: string) => void;
  values: string[];
}

export const TabsContext = createContext<TabsContextValue | null>(null);
