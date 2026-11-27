import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export interface TabItem {
  key: string;
  label: string;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'underline' | 'segmented';
  ariaLabel: string;
  idPrefix?: string;
  hasPanels?: boolean;
  className?: string;
}

/** WAI-ARIA tablist supporting Figma underline tabs (Project/Profile) and segmented pill tabs. */
export function Tabs({
  items,
  activeKey,
  onChange,
  variant = 'underline',
  ariaLabel,
  idPrefix,
  hasPanels = true,
  className,
}: TabsProps) {
  const generatedPrefix = useId();
  const prefix = idPrefix ?? generatedPrefix;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    const item = items[index];
    if (!item || item.disabled) {
      return;
    }
    tabRefs.current[index]?.focus();
    onChange(item.key);
  };

  const findEnabled = (start: number, step: 1 | -1): number => {
    let cursor = start;
    for (let i = 0; i < items.length; i += 1) {
      cursor = (cursor + step + items.length) % items.length;
      if (!items[cursor]?.disabled) {
        return cursor;
      }
    }
    return -1;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        const nextIdx = findEnabled(index, 1);
        if (nextIdx >= 0) {
          focusTab(nextIdx);
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const prevIdx = findEnabled(index, -1);
        if (prevIdx >= 0) {
          focusTab(prevIdx);
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        const firstIdx = items.findIndex((item) => !item.disabled);
        if (firstIdx >= 0) {
          focusTab(firstIdx);
        }
        break;
      }
      case 'End': {
        event.preventDefault();
        for (let i = items.length - 1; i >= 0; i -= 1) {
          if (!items[i]?.disabled) {
            focusTab(i);
            break;
          }
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={cn(
        variant === 'underline' &&
          'flex flex-wrap items-center gap-4 border-b border-border-neutral',
        variant === 'segmented' &&
          'inline-flex flex-wrap items-center gap-1 rounded-pill bg-surface-label p-1',
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={`${prefix}-tab-${item.key}`}
            type="button"
            role="tab"
            disabled={item.disabled}
            aria-selected={isActive}
            aria-controls={hasPanels ? `${prefix}-panel-${item.key}` : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'min-h-touch inline-flex items-center gap-2 text-sm transition-colors motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
              variant === 'underline' && 'border-b-2 px-1 pb-2.5 pt-2 -mb-px font-medium',
              variant === 'underline' &&
                (isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-body hover:text-ink'),
              variant === 'segmented' && 'rounded-pill px-4 py-2 font-medium',
              variant === 'segmented' &&
                (isActive ? 'bg-surface text-ink shadow-segment' : 'text-body hover:text-ink'),
            )}
          >
            <span>{item.label}</span>
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  idPrefix: string;
  tabKey: string;
  isActive: boolean;
  className?: string;
  children: ReactNode;
}

/** Accessible `tabpanel` paired with `<Tabs idPrefix={...} />`. */
export function TabPanel({ idPrefix, tabKey, isActive, className, children }: TabPanelProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div
      id={`${idPrefix}-panel-${tabKey}`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      className={cn('pt-4', className)}
    >
      {children}
    </div>
  );
}
