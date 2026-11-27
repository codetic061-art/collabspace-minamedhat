import { formatDisplayDate } from '@/shared/api/dates';
import { Badge, Skeleton, StatusText } from '@/shared/ui';
import type { DashboardQueryResult } from '../hooks/useDashboard';
import { normalizeDashboardPriority } from '../utils/priority';
import { dashboardStatusTone } from '../utils/taskStatus';
import { DashboardSection, DashboardViewAllLink } from './DashboardSection';

/**
 * Tasks card: `status_label` and the due date only. The dashboard task items have no
 * progress field, so no percentage or progress bar is rendered (M14).
 */
export function TasksCard({
  query,
  className,
}: {
  query: DashboardQueryResult;
  className?: string;
}) {
  return (
    <DashboardSection
      query={query}
      title="Tasks"
      action={<DashboardViewAllLink to="/tasks" />}
      className={className}
      isEmpty={(data) => data.tasks.items.length === 0}
      emptyMessage="No tasks to show yet."
      skeleton={
        <div className="space-y-3">
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      }
    >
      {(data) => (
        <ul className="space-y-3">
          {data.tasks.items.map((task) => {
            const priority = normalizeDashboardPriority(task.priority);
            const formattedDue = task.due_date ? formatDisplayDate(task.due_date) : null;
            const dueText = formattedDue ? `Due ${formattedDue}` : 'No due date';
            return (
              <li key={task.id} className="rounded-card border border-border-subtle p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{task.name}</p>
                  <Badge variant={priority.variant}>{priority.label}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
                  <StatusText tone={dashboardStatusTone(task.status)}>
                    {task.status_label}
                  </StatusText>
                  <span>{dueText}</span>
                </div>
                <p className="mt-1 text-xs text-body">{task.project.name}</p>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
