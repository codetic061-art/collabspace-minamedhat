import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type IconCircleTone =
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'orange'
  | 'violet'
  | 'teal'
  | 'neutral';
export type IconCircleSize = 'sm' | 'md' | 'lg';

const TONE_CLASSES: Record<IconCircleTone, string> = {
  primary: 'bg-primary-tint text-primary',
  success: 'bg-success-tint text-success',
  danger: 'bg-danger-tint text-danger',
  warning: 'bg-warning-tint text-warning',
  orange: 'bg-orange-tint text-orange',
  violet: 'bg-violet-tint text-violet',
  teal: 'bg-teal-tint text-teal',
  neutral: 'bg-surface-label text-heading',
};

const SIZE_CLASSES: Record<IconCircleSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

export interface IconCircleProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: IconCircleTone;
  size?: IconCircleSize;
  children: ReactNode;
}

/** Tinted circular icon wrapper used in stat cards, activity rows, empty states, and error blocks. */
export function IconCircle({
  tone = 'primary',
  size = 'lg',
  className,
  children,
  ...rest
}: IconCircleProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill',
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
