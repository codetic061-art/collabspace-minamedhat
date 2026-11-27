import type { BadgeVariant } from '@/shared/ui';

export interface NormalizedDashboardPriority {
  label: string;
  variant: BadgeVariant;
}

/**
 * Dashboard tasks return lowercase snake_case priorities (`#dashboard-index` CONFLICT #2)
 * while every other task endpoint returns Title-case. Normalise them for display without
 * inventing a value the API did not send.
 */
const PRIORITY_MAP: Record<string, NormalizedDashboardPriority> = {
  low: { label: 'Low', variant: 'low' },
  medium: { label: 'Medium', variant: 'medium' },
  high: { label: 'High', variant: 'high' },
  critical: { label: 'Critical', variant: 'critical' },
};

export function normalizeDashboardPriority(priority: string): NormalizedDashboardPriority {
  return PRIORITY_MAP[priority] ?? { label: priority, variant: 'neutral' };
}
