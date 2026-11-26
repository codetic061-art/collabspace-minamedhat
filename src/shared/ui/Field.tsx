import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from './cn';

export type FieldLabelVariant = 'top' | 'notch' | 'sr-only';

export interface FieldControlA11yProps {
  id: string;
  required: boolean;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

interface FieldContextValue {
  inputId: string;
  errorId: string;
  hintId: string;
  hasError: boolean;
  required: boolean;
  describedBy: string | undefined;
  labelVariant: FieldLabelVariant;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Reads enclosing `<Field>` accessibility bindings when a primitive is composed inside `<Field>`. */
export function useFieldContext(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FieldProps {
  id?: string;
  label: string;
  labelVariant?: FieldLabelVariant;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode | ((a11yProps: FieldControlA11yProps) => ReactNode);
}

/** Form field wrapper connecting a visible label, optional helper text, `aria-invalid`, and error text. */
export function Field({
  id,
  label,
  labelVariant = 'top',
  error,
  hint,
  required = false,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const hasError = Boolean(error);

  const describedIds: string[] = [];
  if (hint) {
    describedIds.push(hintId);
  }
  if (error) {
    describedIds.push(errorId);
  }
  const describedBy = describedIds.length > 0 ? describedIds.join(' ') : undefined;

  const a11yProps: FieldControlA11yProps = {
    id: inputId,
    required,
    'aria-invalid': hasError ? true : undefined,
    'aria-describedby': describedBy,
  };

  const contextValue: FieldContextValue = {
    inputId,
    errorId,
    hintId,
    hasError,
    required,
    describedBy,
    labelVariant,
  };

  const renderedChildren = typeof children === 'function' ? children(a11yProps) : children;

  const labelElement = (
    <label
      htmlFor={inputId}
      className={cn(
        labelVariant === 'sr-only' && 'sr-only',
        labelVariant === 'top' && 'block text-sm font-semibold text-heading',
        labelVariant === 'notch' &&
          'pointer-events-none absolute -top-2.5 left-3 z-10 rounded-input bg-surface-input px-1.5 text-xs font-medium',
        labelVariant === 'notch' && (hasError ? 'text-danger' : 'text-body'),
      )}
    >
      <span>{label}</span>
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );

  return (
    <FieldContext.Provider value={contextValue}>
      <div className={cn('w-full space-y-1.5', className)}>
        {labelVariant === 'notch' ? (
          <div className="relative pt-1">
            {labelElement}
            {renderedChildren}
          </div>
        ) : (
          <>
            {labelElement}
            {renderedChildren}
          </>
        )}

        {hint ? (
          <p id={hintId} className="text-xs text-body">
            {hint}
          </p>
        ) : null}

        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
