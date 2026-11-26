import { cn } from './cn';

export type ProgressTone = 'primary' | 'success' | 'warning' | 'orange' | 'danger' | 'violet' | 'teal';

const TRACK_CLASSES: Record<ProgressTone, string> = {
  primary: 'bg-primary-tint',
  success: 'bg-success-tint',
  warning: 'bg-warning-tint',
  orange: 'bg-orange-tint',
  danger: 'bg-danger-tint',
  violet: 'bg-violet-tint',
  teal: 'bg-teal-tint',
};

const BAR_CLASSES: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  orange: 'bg-orange',
  danger: 'bg-danger',
  violet: 'bg-violet',
  teal: 'bg-teal',
};

function clampPercentage(value: number, max = 100): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  const ratio = (value / max) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Accessible rounded progress bar matching Figma stat card and project list progress bars. */
export function ProgressBar({
  value,
  max = 100,
  tone = 'primary',
  label,
  size = 'sm',
  className,
}: ProgressBarProps) {
  const clamped = clampPercentage(value, max);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn(
        'w-full overflow-hidden rounded-pill',
        TRACK_CLASSES[tone],
        size === 'sm' ? 'h-2' : 'h-3',
        className,
      )}
    >
      <div
        style={{ width: `${clamped}%` }}
        className={cn(
          'h-full rounded-pill transition-[width] duration-200 motion-reduce:transition-none',
          BAR_CLASSES[tone],
        )}
      />
    </div>
  );
}

export interface GaugeProps {
  value: number;
  label: string;
  caption?: string;
  className?: string;
}

const GAUGE_RADIUS = 46;
const SEMICIRCLE_LENGTH = Math.PI * GAUGE_RADIUS;

/** Accessible SVG semicircle completion gauge using CSS design tokens only (ADR-09). */
export function Gauge({ value, label, caption, className }: GaugeProps) {
  const clamped = clampPercentage(value, 100);
  const progressOffset = SEMICIRCLE_LENGTH - (clamped / 100) * SEMICIRCLE_LENGTH;
  const angleRad = Math.PI - (clamped / 100) * Math.PI;
  const needleX = 60 + 34 * Math.cos(angleRad);
  const needleY = 60 - 34 * Math.sin(angleRad);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        viewBox="0 0 120 72"
        role="img"
        aria-label={`${label}: ${clamped}%`}
        className="w-40 max-w-full overflow-visible"
      >
        <path
          d="M 14 60 A 46 46 0 0 1 106 60"
          fill="none"
          stroke="var(--color-primary-tint)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 14 60 A 46 46 0 0 1 106 60"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={SEMICIRCLE_LENGTH}
          strokeDashoffset={progressOffset}
        />
        <line
          x1="60"
          y1="60"
          x2={needleX}
          y2={needleY}
          stroke="var(--color-ink)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="4" fill="var(--color-primary)" />
      </svg>
      <p className="mt-1 text-2xl font-semibold text-ink">{clamped}%</p>
      {caption ? <p className="text-xs text-body">{caption}</p> : null}
    </div>
  );
}
