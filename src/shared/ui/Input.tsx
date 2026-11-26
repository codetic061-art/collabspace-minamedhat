import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react';
import { Check } from 'lucide-react';
import { cn } from './cn';
import {
  Field,
  useFieldContext,
  type FieldControlA11yProps,
  type FieldLabelVariant,
} from './Field';

export type InputShape = 'notch' | 'pill';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  labelVariant?: FieldLabelVariant;
  shape?: InputShape;
  error?: string;
  hint?: string;
  leadingIcon?: ReactNode;
  trailingAdornment?: ReactNode;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Renders the shared Figma notch or pill `<input>` control with optional icons and Field wiring. */
export function Input({
  id,
  label,
  labelVariant = 'notch',
  shape,
  error,
  hint,
  required,
  leadingIcon,
  trailingAdornment,
  className,
  wrapperClassName,
  ref,
  ...rest
}: InputProps) {
  const field = useFieldContext();

  const resolvedVariant = field ? field.labelVariant : labelVariant;
  const resolvedShape: InputShape = shape ?? (resolvedVariant === 'notch' ? 'notch' : 'pill');

  const renderControl = (a11y?: FieldControlA11yProps) => {
    const effectiveId = id ?? a11y?.id ?? field?.inputId;
    const effectiveRequired = required ?? a11y?.required ?? field?.required;
    const isFieldInvalid = error || field?.hasError ? true : undefined;
    const effectiveInvalid = rest['aria-invalid'] ?? a11y?.['aria-invalid'] ?? isFieldInvalid;
    const effectiveDescribedBy =
      rest['aria-describedby'] ?? a11y?.['aria-describedby'] ?? field?.describedBy;

    return (
      <div
        className={cn(
          'flex min-h-touch w-full items-center gap-2 border px-3.5 transition-colors motion-reduce:transition-none',
          resolvedShape === 'notch'
            ? 'rounded-input bg-surface-input'
            : 'rounded-pill bg-surface border-profile-border',
          effectiveInvalid
            ? 'border-danger focus-within:border-danger'
            : resolvedShape === 'notch'
              ? 'border-border-input focus-within:border-primary'
              : 'border-profile-border focus-within:border-primary',
          rest.disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        {leadingIcon ? (
          <span className="inline-flex shrink-0 items-center text-body" aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={effectiveId}
          required={effectiveRequired}
          aria-invalid={effectiveInvalid}
          aria-describedby={effectiveDescribedBy}
          className={cn(
            'w-full min-w-0 bg-transparent py-2.5 text-sm text-ink placeholder:text-body focus:outline-none',
            className,
          )}
          {...rest}
        />

        {trailingAdornment ? (
          <span className="inline-flex shrink-0 items-center gap-1">{trailingAdornment}</span>
        ) : null}
      </div>
    );
  };

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
        {(a11yProps) => renderControl(a11yProps)}
      </Field>
    );
  }

  return renderControl();
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelVariant?: FieldLabelVariant;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Accessible multiline text input matching the Figma input tokens and optional notch label. */
export function Textarea({
  id,
  label,
  labelVariant = 'top',
  error,
  hint,
  required,
  rows = 4,
  className,
  wrapperClassName,
  ref,
  ...rest
}: TextareaProps) {
  const field = useFieldContext();

  const renderControl = (a11y?: FieldControlA11yProps) => {
    const effectiveId = id ?? a11y?.id ?? field?.inputId;
    const effectiveRequired = required ?? a11y?.required ?? field?.required;
    const isFieldInvalid = error || field?.hasError ? true : undefined;
    const effectiveInvalid = rest['aria-invalid'] ?? a11y?.['aria-invalid'] ?? isFieldInvalid;
    const effectiveDescribedBy =
      rest['aria-describedby'] ?? a11y?.['aria-describedby'] ?? field?.describedBy;

    return (
      <textarea
        ref={ref}
        id={effectiveId}
        rows={rows}
        required={effectiveRequired}
        aria-invalid={effectiveInvalid}
        aria-describedby={effectiveDescribedBy}
        className={cn(
          'w-full rounded-input border bg-surface-input px-3.5 py-2.5 text-sm text-ink placeholder:text-body transition-colors motion-reduce:transition-none focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          effectiveInvalid ? 'border-danger focus:border-danger' : 'border-border-input',
          className,
        )}
        {...rest}
      />
    );
  };

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
        {(a11yProps) => renderControl(a11yProps)}
      </Field>
    );
  }

  return renderControl();
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Primary-blue checked checkbox matching Figma auth Remember Me control with accessible hit target. */
export function Checkbox({
  id,
  label,
  error,
  className,
  checked,
  defaultChecked,
  disabled,
  ref,
  ...rest
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex min-h-touch items-center gap-2.5 text-sm text-heading select-none',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
        <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="peer h-5 w-5 appearance-none rounded border border-border-input bg-surface checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            {...rest}
          />
          <Check
            className="pointer-events-none absolute h-3.5 w-3.5 text-surface opacity-0 peer-checked:opacity-100"
            aria-hidden="true"
          />
        </span>
        <span>{label}</span>
      </label>

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
