import { useState, type ReactNode } from 'react';
import { cn } from './cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_DIMENSIONS: Record<AvatarSize, { px: number; className: string; textClass: string }> = {
  xs: { px: 24, className: 'h-6 w-6', textClass: 'text-micro' },
  sm: { px: 32, className: 'h-8 w-8', textClass: 'text-xs' },
  md: { px: 40, className: 'h-10 w-10', textClass: 'text-sm' },
  lg: { px: 64, className: 'h-16 w-16', textClass: 'text-lg' },
  xl: { px: 92, className: 'h-avatar-xl w-avatar-xl', textClass: 'text-2xl' },
};

/** Derives up to two uppercase initials from a display name. */
export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  badge?: ReactNode;
  className?: string;
}

/** Circular user avatar with lazy loading, explicit dimensions, initials fallback, and optional corner badge. */
export function Avatar({ name, src, alt, size = 'sm', badge, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const spec = SIZE_DIMENSIONS[size];
  const normalizedSrc = src && src.trim().length > 0 ? src : null;
  const showImage = normalizedSrc !== null && failedSrc !== normalizedSrc;

  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
      {showImage ? (
        <img
          src={normalizedSrc}
          alt={alt ?? name}
          width={spec.px}
          height={spec.px}
          loading="lazy"
          onError={() => setFailedSrc(normalizedSrc)}
          className={cn(
            'rounded-pill border border-surface object-cover bg-primary-tint',
            spec.className,
          )}
        />
      ) : (
        <span
          role="img"
          aria-label={alt ?? name}
          className={cn(
            'inline-flex items-center justify-center rounded-pill border border-surface bg-primary-tint font-semibold text-primary select-none',
            spec.className,
            spec.textClass,
          )}
        >
          {getInitials(name)}
        </span>
      )}
      {badge ? <span className="absolute -right-0.5 -bottom-0.5">{badge}</span> : null}
    </span>
  );
}

export interface AvatarStackItem {
  id: string | number;
  name: string;
  src?: string | null;
}

export interface AvatarStackProps {
  items: readonly AvatarStackItem[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}

/** Overlapping avatar group displaying up to `max` avatars followed by a `+N` overflow badge. */
export function AvatarStack({ items, max = 3, size = 'xs', className }: AvatarStackProps) {
  const visible = items.slice(0, max);
  const overflow = Math.max(0, items.length - visible.length);
  const spec = SIZE_DIMENSIONS[size];

  return (
    <div
      className={cn('flex items-center -space-x-2', className)}
      aria-label={`${items.length} members`}
    >
      {visible.map((member) => (
        <Avatar key={member.id} name={member.name} src={member.src} size={size} />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-pill border border-surface bg-surface-label font-medium text-heading',
            spec.className,
            spec.textClass,
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
