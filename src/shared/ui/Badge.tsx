import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type BadgeVariant =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'completion'
  | 'primary'
  | 'neutral'
  | 'orange'
  | 'violet'
  | 'teal'
  | 'purple'
  | 'pink';

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  low: 'bg-success-tint text-success',
  medium: 'bg-warning-tint text-warning',
  high: 'bg-danger-tint text-danger',
  critical: 'bg-priority-critical-bg text-priority-critical-text',
  completion: 'bg-success-tint text-success',
  primary: 'bg-primary-tint text-primary',
  neutral: 'bg-surface-label text-gray-500',
  orange: 'bg-orange-tint text-orange',
  violet: 'bg-violet-tint text-violet',
  teal: 'bg-teal-tint text-teal',
  purple: 'bg-violet-tint text-purple',
  pink: 'bg-pink-tint text-pink',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: ReactNode;
}

/** Pill badge always pairing color tokens with readable text labels for priority, completion, and tags. */
export function Badge({
  variant = 'neutral',
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium whitespace-nowrap',
        BADGE_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}

export type StatusTextTone = 'pending' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled' | 'review';

const STATUS_TEXT_CLASSES: Record<StatusTextTone, string> = {
  pending: 'text-status-pending',
  'in-progress': 'text-status-in-progress',
  'on-hold': 'text-status-on-hold',
  completed: 'text-status-completed',
  cancelled: 'text-status-cancelled',
  review: 'text-purple',
};

export interface StatusTextProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusTextTone;
}

/** Borderless colored status text label matching All Projects table and derived M4 palette. */
export function StatusText({ tone, className, children, ...rest }: StatusTextProps) {
  return (
    <span
      className={cn('inline-flex items-center text-sm font-medium', STATUS_TEXT_CLASSES[tone], className)}
      {...rest}
    >
      {children}
    </span>
  );
}
