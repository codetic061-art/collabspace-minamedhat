import { Pencil } from 'lucide-react';
import { Link } from 'react-router';
import { formatDisplayDate, type ProjectOverviewResource } from '@/shared/api';
import { Badge, Breadcrumb, Button, Card, ProgressBar } from '@/shared/ui';

export interface ProjectDetailsHeaderProps {
  project: ProjectOverviewResource;
  canEdit: boolean;
  onEdit: () => void;
}

function computeTimelineProgress(
  totalDays: number,
  daysRemaining: number,
  isOverdue: boolean,
): number {
  if (isOverdue) {
    return 100;
  }
  if (totalDays <= 0) {
    return 0;
  }
  const elapsed = totalDays - Math.max(0, daysRemaining);
  return Math.max(0, Math.min(100, Math.round((elapsed / totalDays) * 100)));
}

/**
 * Project Details header (`1:8753`, §3.5, §12.6):
 * breadcrumb, title + completion pill, role-gated Edit Project button, and Due Date card.
 */
export function ProjectDetailsHeader({ project, canEdit, onEdit }: ProjectDetailsHeaderProps) {
  const { due_date_indicator: due } = project;
  const completionPercent = Math.round(project.progress_percentage);
  const timelineProgress = computeTimelineProgress(
    due.total_days,
    due.days_remaining,
    due.is_overdue,
  );
  const dueStatusText = due.is_overdue
    ? 'Overdue'
    : `${due.days_remaining} ${due.days_remaining === 1 ? 'day' : 'days'} left`;

  const renderProjectsLink = (label: string, className: string) => (
    <Link to="/projects" className={className}>
      {label}
    </Link>
  );

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            {
              label: 'Projects',
              renderLink: renderProjectsLink,
            },
            { label: project.name },
          ]}
        />

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink">{project.name}</h1>
          <Badge variant="completion">{completionPercent}% Completed</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {canEdit ? (
          <Button
            variant="outline"
            leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
            onClick={onEdit}
            className="shrink-0"
          >
            Edit Project
          </Button>
        ) : null}

        <Card variant="bordered" className="w-full sm:w-80 space-y-2.5 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Due Date</h2>
            <span
              className={
                due.is_overdue
                  ? 'text-xs font-medium text-danger'
                  : 'text-xs font-medium text-body'
              }
            >
              {dueStatusText}
            </span>
          </div>

          <ProgressBar
            value={timelineProgress}
            tone={due.is_overdue ? 'danger' : 'primary'}
            label="Project schedule progress"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-heading">
            <span>Start Date: {formatDisplayDate(due.start_date)}</span>
            <span>Deadline: {formatDisplayDate(due.deadline)}</span>
          </div>
        </Card>
      </div>
    </header>
  );
}
