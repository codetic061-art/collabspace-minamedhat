import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { Field, useFieldContext, type FieldLabelVariant } from './Field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  label?: string;
  labelVariant?: FieldLabelVariant;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  leadingIcon?: ReactNode;
  variant?: 'pill' | 'notch' | 'minimal';
  className?: string;
  triggerClassName?: string;
}

/** Accessible custom select implementing WAI-ARIA listbox semantics and Figma selected check indicators. */
export function Select({
  id,
  label,
  labelVariant = 'top',
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  error,
  hint,
  disabled = false,
  required = false,
  leadingIcon,
  variant,
  className,
  triggerClassName,
}: SelectProps) {
  const field = useFieldContext();
  const generatedId = useId();
  const triggerId = id ?? field?.inputId ?? generatedId;
  const listboxId = `${triggerId}-listbox`;

  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
  const currentValue = value !== undefined ? value : uncontrolledValue;
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const effectiveInvalid = Boolean(error || field?.hasError);
  const effectiveDescribedBy = field?.describedBy;
  const resolvedVariant = variant ?? (labelVariant === 'notch' ? 'notch' : 'pill');

  const selectedOption = options.find((opt) => opt.value === currentValue);
  const firstEnabledIndex = options.findIndex((opt) => !opt.disabled);
  const selectedIndex = options.findIndex((opt) => opt.value === currentValue && !opt.disabled);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusIdx = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex;
    if (focusIdx >= 0) {
      optionRefs.current[focusIdx]?.focus();
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, selectedIndex, firstEnabledIndex]);

  const selectOption = (nextValue: string) => {
    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }
    onChange?.(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const moveFocus = (fromIndex: number, direction: 1 | -1 | 'first' | 'last') => {
    if (options.length === 0) {
      return;
    }

    if (direction === 'first') {
      const idx = options.findIndex((opt) => !opt.disabled);
      if (idx >= 0) {
        optionRefs.current[idx]?.focus();
      }
      return;
    }

    if (direction === 'last') {
      for (let i = options.length - 1; i >= 0; i -= 1) {
        if (!options[i]?.disabled) {
          optionRefs.current[i]?.focus();
          return;
        }
      }
      return;
    }

    let cursor = fromIndex;
    for (let step = 0; step < options.length; step += 1) {
      cursor = (cursor + direction + options.length) % options.length;
      if (!options[cursor]?.disabled) {
        optionRefs.current[cursor]?.focus();
        return;
      }
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      if (!isOpen) {
        event.preventDefault();
        setIsOpen(true);
      }
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
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
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const control = (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-invalid={effectiveInvalid ? true : undefined}
        aria-describedby={effectiveDescribedBy}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex min-h-touch w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
          resolvedVariant === 'minimal' &&
            'rounded-pill bg-transparent text-ink hover:bg-surface-input px-2',
          resolvedVariant === 'notch' &&
            'rounded-input border bg-surface-input text-ink border-border-input',
          resolvedVariant === 'pill' &&
            'rounded-pill border bg-surface text-ink border-border-card hover:bg-surface-input',
          effectiveInvalid && resolvedVariant !== 'minimal' && 'border-danger',
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {leadingIcon ? (
            <span className="inline-flex shrink-0 text-body" aria-hidden="true">
              {leadingIcon}
            </span>
          ) : null}
          <span className={cn('truncate', selectedOption ? 'text-ink' : 'text-body')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-body transition-transform motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          className="absolute left-0 z-30 mt-2 max-h-60 w-full min-w-44 overflow-auto rounded-card border border-border-subtle bg-surface py-1 shadow-popover divide-y divide-border-subtle"
        >
          {options.map((option, index) => {
            const isSelected = option.value === currentValue;
            return (
              <button
                key={option.value}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                role="option"
                disabled={option.disabled}
                aria-selected={isSelected}
                onClick={() => selectOption(option.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={cn(
                  'flex min-h-touch w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors motion-reduce:transition-none cursor-pointer focus:bg-primary-tint/50 focus:outline-none hover:bg-surface-input disabled:cursor-not-allowed disabled:opacity-50',
                  isSelected ? 'font-medium text-ink bg-surface-input' : 'text-heading',
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? (
                  <span
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-success text-surface"
                    aria-hidden="true"
                  >
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  if (label !== undefined) {
    return (
      <Field
        id={id}
        label={label}
        labelVariant={labelVariant}
        error={error}
        hint={hint}
        required={required}
      >
        {control}
      </Field>
    );
  }

  return control;
}

export interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelVariant?: FieldLabelVariant;
  options: readonly SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  ref?: Ref<HTMLSelectElement>;
}

/** Semantic native `<select>` wired into `<Field>` for form controls requiring native pickers. */
export function NativeSelect({
  id,
  label,
  labelVariant = 'top',
  options,
  placeholder,
  error,
  hint,
  required,
  className,
  wrapperClassName,
  ref,
  ...rest
}: NativeSelectProps) {
  const field = useFieldContext();

  const effectiveId = id ?? field?.inputId;
  const effectiveInvalid = rest['aria-invalid'] ?? (error || field?.hasError ? true : undefined);
  const effectiveDescribedBy = rest['aria-describedby'] ?? field?.describedBy;
  const resolvedVariant = field ? field.labelVariant : labelVariant;

  const selectEl = (
    <div className="relative">
      <select
        ref={ref}
        id={effectiveId}
        required={required}
        aria-invalid={effectiveInvalid}
        aria-describedby={effectiveDescribedBy}
        className={cn(
          'min-h-touch w-full appearance-none border bg-surface-input px-3.5 pr-9 py-2 text-sm text-ink transition-colors motion-reduce:transition-none focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          resolvedVariant === 'notch' ? 'rounded-input' : 'rounded-pill bg-surface',
          effectiveInvalid ? 'border-danger focus:border-danger' : 'border-border-input',
          className,
        )}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-body"
        aria-hidden="true"
      />
    </div>
  );

  if (label !== undefined) {
    return (
      <Field
        id={id}
        label={label}
        labelVariant={labelVariant}
        error={error}
        hint={hint}
        required={required}
        className={wrapperClassName}
      >
        {selectEl}
      </Field>
    );
  }

  return selectEl;
}
