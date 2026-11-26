import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onSelect: () => void;
}

export interface DropdownMenuProps {
  triggerLabel?: string;
  trigger: (props: {
    id: string;
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
    'aria-controls': string | undefined;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  }) => ReactNode;
  items: readonly DropdownMenuItem[];
  header?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

/** Accessible WAI-ARIA menu-button dropdown supporting arrow navigation, Escape close, and focus return. */
export function DropdownMenu({
  triggerLabel,
  trigger,
  items,
  header,
  align = 'end',
  className,
}: DropdownMenuProps) {
  const triggerId = useId();
  const menuId = `${triggerId}-menu`;
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingFocusTargetRef = useRef<'first' | 'last'>('first');

  const focusTrigger = () => {
    const triggerEl = document.getElementById(triggerId);
    if (triggerEl instanceof HTMLElement) {
      triggerEl.focus();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusEdge = () => {
      if (pendingFocusTargetRef.current === 'last') {
        for (let i = items.length - 1; i >= 0; i -= 1) {
          if (!items[i]?.disabled) {
            itemRefs.current[i]?.focus();
            return;
          }
        }
        return;
      }

      const firstEnabled = items.findIndex((item) => !item.disabled);
      if (firstEnabled >= 0) {
        itemRefs.current[firstEnabled]?.focus();
      }
    };

    focusEdge();

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, items]);

  const moveFocus = (fromIndex: number, direction: 1 | -1 | 'first' | 'last') => {
    if (items.length === 0) {
      return;
    }

    if (direction === 'first') {
      const idx = items.findIndex((item) => !item.disabled);
      if (idx >= 0) {
        itemRefs.current[idx]?.focus();
      }
      return;
    }

    if (direction === 'last') {
      for (let i = items.length - 1; i >= 0; i -= 1) {
        if (!items[i]?.disabled) {
          itemRefs.current[i]?.focus();
          return;
        }
      }
      return;
    }

    let cursor = fromIndex;
    for (let step = 0; step < items.length; step += 1) {
      cursor = (cursor + direction + items.length) % items.length;
      if (!items[cursor]?.disabled) {
        itemRefs.current[cursor]?.focus();
        return;
      }
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      if (!isOpen) {
        event.preventDefault();
        pendingFocusTargetRef.current = 'first';
        setIsOpen(true);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      pendingFocusTargetRef.current = 'last';
      setIsOpen(true);
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const handleMenuItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(index, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(index, -1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(index, 'first');
        break;
      case 'End':
        event.preventDefault();
        moveFocus(index, 'last');
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        focusTrigger();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {trigger({
        id: triggerId,
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? menuId : undefined,
        onClick: () => {
          pendingFocusTargetRef.current = 'first';
          setIsOpen((prev) => !prev);
        },
        onKeyDown: handleTriggerKeyDown,
      })}

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          aria-labelledby={triggerLabel ? undefined : triggerId}
          className={cn(
            'absolute z-40 mt-2 min-w-52 rounded-card border border-border-subtle bg-surface py-1.5 shadow-popover',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {header ? (
            <div className="border-b border-border-subtle px-4 py-2.5">{header}</div>
          ) : null}
          <div className="divide-y divide-border-subtle">
            {items.map((item, index) => (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  focusTrigger();
                  item.onSelect();
                }}
                onKeyDown={(event) => handleMenuItemKeyDown(event, index)}
                className={cn(
                  'flex min-h-touch w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors motion-reduce:transition-none cursor-pointer focus:bg-surface-input focus:outline-none hover:bg-surface-input disabled:cursor-not-allowed disabled:opacity-50',
                  item.tone === 'danger' ? 'text-danger font-medium' : 'text-ink',
                )}
              >
                {item.icon ? (
                  <span className="inline-flex shrink-0 items-center" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
