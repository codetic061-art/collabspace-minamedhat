import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type CardVariant = 'default' | 'bordered' | 'elevated' | 'settings';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: 'rounded-card bg-surface p-5',
  bordered: 'rounded-card border border-border-subtle bg-surface p-5',
  elevated: 'rounded-modal bg-surface p-8 shadow-auth',
  settings: 'rounded-settings border border-profile-divider bg-surface p-6',
};

/** Surface container with Figma dashboard, bordered, auth/elevated, and profile settings variants. */
export function Card({
  variant = 'default',
  header,
  footer,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div className={cn(VARIANT_CLASSES[variant], className)} {...rest}>
      {header ? <div className="mb-4">{header}</div> : null}
      {children}
      {footer ? <div className="mt-4 pt-3 border-t border-border-subtle">{footer}</div> : null}
    </div>
  );
}
