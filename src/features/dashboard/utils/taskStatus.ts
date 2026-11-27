import type { StatusTextTone } from '@/shared/ui';

/**
 * Maps the dashboard's lowercase `status` enum (`#dashboard-index` CONFLICT #2) to the
 * shared derived status palette. The visible text always comes from the API `status_label`.
 */
const STATUS_TONE_MAP: Record<string, StatusTextTone> = {
  pending: 'pending',
  in_progress: 'in-progress',
  in_review: 'review',
  completed: 'completed',
};

export function dashboardStatusTone(status: string): StatusTextTone {
  return STATUS_TONE_MAP[status] ?? 'pending';
}
