import type { ReactNode } from 'react';
import { AlertCircle, FolderOpen, Lock, SearchX } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { cn } from './cn';
import { IconCircle, type IconCircleTone } from './IconCircle';

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'row';
  className?: string;
}

const SKELETON_CLASSES: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 w-full rounded-input bg-surface-label',
  rect: 'h-24 w-full rounded-card bg-surface-label',
  circle: 'h-10 w-10 rounded-pill bg-surface-label',
  card: 'h-40 w-full rounded-card bg-surface-label',
  row: 'h-16 w-full rounded-card bg-surface border border-border-subtle',
};

/** Decorative loading placeholder honoring reduced-motion preferences (ID-23). */
export function Skeleton({ variant = 'rect', className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse motion-reduce:animate-none',
        SKELETON_CLASSES[variant],
        className,
      )}
    />
  );
}

export interface SkeletonRegionProps {
  label: string;
  className?: string;
  children: ReactNode;
}

/** Semantic `aria-busy` container wrapping a group of `<Skeleton>` placeholders. */
export function SkeletonRegion({ label, className, children }: SkeletonRegionProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

/** Empty card state featuring a 56px tinted icon circle, plain-English message, and optional permitted CTA. */
export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
      <IconCircle tone="primary" size="lg">
        {icon ?? <FolderOpen className="h-6 w-6" aria-hidden="true" />}
      </IconCircle>
      {title ? <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3> : null}
      <p className="mt-2 max-w-md text-sm text-heading">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export interface BlockErrorStateProps {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

/** Card-level failure state presenting a friendly non-technical message and optional Retry action (ID-23). */
export function BlockErrorState({
  title,
  message = 'Something went wrong. Please try again.',
  retryLabel = 'Retry',
  onRetry,
  className,
}: BlockErrorStateProps) {
  return (
    <Card
      role="alert"
      className={cn('flex flex-col items-center justify-center py-8 text-center', className)}
    >
      <IconCircle tone="danger" size="lg">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </IconCircle>
      {title ? <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3> : null}
      <p className="mt-2 max-w-md text-sm text-heading">{message}</p>
      {onRetry ? (
        <div className="mt-5">
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export interface PageStatusStateProps {
  icon: ReactNode;
  tone?: IconCircleTone;
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

/** Shared centered status layout reused by page-level Access Denied and Not Found states. */
export function PageStatusState({
  icon,
  tone = 'primary',
  title,
  message,
  action,
  className,
}: PageStatusStateProps) {
  return (
    <Card
      className={cn(
        'mx-auto flex max-w-lg flex-col items-center px-6 py-12 text-center',
        className,
      )}
    >
      <IconCircle tone={tone} size="lg">
        {icon}
      </IconCircle>
      <h1 className="mt-5 text-xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-heading">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}

export interface StatusPageProps {
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

/** Page-level 403 permission denied state matching `figma.md` §12.10 and ID-23. */
export function AccessDeniedState({
  title = "You don't have access to this page.",
  message = 'Your current role does not allow viewing this section.',
  action,
  className,
}: StatusPageProps) {
  return (
    <PageStatusState
      icon={<Lock className="h-6 w-6" aria-hidden="true" />}
      tone="danger"
      title={title}
      message={message}
      action={action}
      className={className}
    />
  );
}

/** Page-level 404 / missing-entity state matching `figma.md` §12.10 and ID-23. */
export function NotFoundState({
  title = 'Page not found',
  message = "This item or page doesn't exist or was removed.",
  action,
  className,
}: StatusPageProps) {
  return (
    <PageStatusState
      icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
      tone="primary"
      title={title}
      message={message}
      action={action}
      className={className}
    />
  );
}
