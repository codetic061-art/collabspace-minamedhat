import { Pencil } from 'lucide-react';
import { Link } from 'react-router';
import { formatDisplayDate, type ProjectOverviewResource } from '@/shared/api';
import { Badge, Breadcrumb, Button, Card, ProgressBar, cn } from '@/shared/ui';

export interface ProjectDetailsHeaderProps {
  project: ProjectOverviewResource;
  canEdit: boolean;
  onEdit: () => void;
}

function computeTimelineProgress(due: ProjectOverviewResource['due_date_indicator']): number {
  if (due.is_overdue) {
    return 100;
  }
  if (due.total_days <= 0) {
    return 0;
  }
  const elapsed = due.total_days - Math.max(0, due.days_remaining);
  return Math.max(0, Math.min(100, Math.round((elapsed / due.total_days) * 100)));
}

function formatDueStatus(daysRemaining: number, isOverdue: boolean): string {
  if (isOverdue) {
    return 'Overdue';
  }
  const unit = daysRemaining === 1 ? 'day' : 'days';
  return `${daysRemaining} ${unit} left`;
}

function renderProjectsLink(label: string, className: string) {
  return <Link to="/projects" className={className}>{label}</Link>;
}

const META_ROW_CLASS =
  'flex flex-wrap items-center justify-between gap-2 text-xs text-heading';

/**
 * Project Details header (`1:8753`, §3.5, §12.6):
 * breadcrumb, title + completion pill, role-gated Edit Project button, and Due Date card.
 */
export function ProjectDetailsHeader({ project, canEdit, onEdit }: ProjectDetailsHeaderProps) {
  const { due_date_indicator: due } = project;
  const completionPercent = Math.round(project.progress_percentage);
  const timelineProgress = computeTimelineProgress(due);
  const dueStatusText = formatDueStatus(due.days_remaining, due.is_overdue);
  const dueToneClass = due.is_overdue ? 'text-danger' : 'text-body';
  const progressTone = due.is_overdue ? 'danger' : 'primary';

  const projectsCrumb = { label: 'Projects', renderLink: renderProjectsLink };
  const breadcrumbItems = [projectsCrumb, { label: project.name }];

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <Breadcrumb items={breadcrumbItems} />

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
            <span className={cn('text-xs font-medium', dueToneClass)}>{dueStatusText}</span>
          </div>

          <ProgressBar
            value={timelineProgress}
            tone={progressTone}
            label="Project schedule progress"
          />

          <div className={META_ROW_CLASS}>
            <span>Start Date: {formatDisplayDate(due.start_date)}</span>
            <span>Deadline: {formatDisplayDate(due.deadline)}</span>
          </div>
        </Card>
      </div>
    </header>
  );
}
