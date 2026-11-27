import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'outline' | 'dashed' | 'dark' | 'link' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'rounded-pill bg-primary text-surface hover:bg-primary/90 active:bg-primary/80 disabled:bg-primary/50',
  outline:
    'rounded-pill border border-border-card bg-surface text-ink hover:bg-surface-input active:bg-surface-label disabled:opacity-50',
  dashed:
    'rounded-pill border border-dashed border-primary bg-surface text-primary hover:bg-primary-tint/50 active:bg-primary-tint disabled:opacity-50',
  dark: 'rounded-pill bg-dark text-surface hover:bg-dark/90 active:bg-black disabled:opacity-50',
  link: 'rounded-input bg-transparent text-link hover:underline active:opacity-80 disabled:opacity-50 px-1',
  danger:
    'rounded-pill bg-danger text-surface hover:bg-danger/90 active:bg-danger/80 disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-touch px-3.5 py-2 text-xs font-medium',
  md: 'min-h-touch px-5 py-2.5 text-sm font-medium',
  lg: 'min-h-touch px-6 py-3 text-base font-medium',
};

const ICON_ONLY_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-touch min-w-touch p-2 text-xs',
  md: 'min-h-touch min-w-touch p-2.5 text-sm',
  lg: 'min-h-touch min-w-touch p-3 text-base',
};

/** Computes token-based classes shared across `<Button>` and router `<Link>` triggers. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  className,
}: ButtonStyleOptions = {}): string {
  const sizeClass =
    variant === 'link'
      ? 'min-h-touch inline-flex items-center justify-center text-sm font-medium'
      : iconOnly
        ? ICON_ONLY_SIZE_CLASSES[size]
        : SIZE_CLASSES[size];

  return cn(
    'inline-flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed select-none',
    VARIANT_CLASSES[variant],
    sizeClass,
    fullWidth && 'w-full',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** Accessible button implementing all Figma CTA, outline, dashed, dark inline, link, and danger variants. */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  type = 'button',
  disabled,
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={buttonClassName({ variant, size, fullWidth, iconOnly, className })}
      {...rest}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      <span>{isLoading && loadingText ? loadingText : children}</span>
      {!isLoading ? rightIcon : null}
    </button>
  );
}
