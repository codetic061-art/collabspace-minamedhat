import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

const BADGE_CLASSES = {
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
} as const;

export type BadgeVariant = keyof typeof BADGE_CLASSES;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: ReactNode;
}

/** Pill badge always pairing color tokens with readable text labels for priority, completion, and tags. */
export function Badge({ variant = 'neutral', icon, className, children, ...rest }: BadgeProps) {
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

const STATUS_TEXT_CLASSES = {
  pending: 'text-status-pending',
  'in-progress': 'text-status-in-progress',
  'on-hold': 'text-status-on-hold',
  completed: 'text-status-completed',
  cancelled: 'text-status-cancelled',
  review: 'text-purple',
} as const;

export type StatusTextTone = keyof typeof STATUS_TEXT_CLASSES;

export interface StatusTextProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusTextTone;
}

/** Borderless colored status text label matching All Projects table and derived M4 palette. */
export function StatusText({ tone, className, children, ...rest }: StatusTextProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-sm font-medium',
        STATUS_TEXT_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
