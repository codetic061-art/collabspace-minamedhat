import { Calendar, CheckCircle2, Flag, ListChecks } from 'lucide-react';
import { lazy, Suspense } from 'react';
import {
  formatDisplayDate,
  type ProjectOverviewWithChart,
  type ProjectTeamProgress,
} from '@/shared/api';
import { BlockErrorBoundary, Card, Gauge, IconCircle } from '@/shared/ui';
import { ProjectPriorityBadge, ProjectStatusText } from './ProjectBadges';
import { ProjectOverviewChartSkeleton } from './ProjectOverviewChartSkeleton';
import { ProjectTeamMembersCard } from './ProjectTeamMembersCard';

const LazyProjectOverviewChart = lazy(() =>
  import('./ProjectOverviewChart').then((module) => ({
    default: module.ProjectOverviewChart,
  })),
);

export interface ProjectOverviewTabProps {
  project: ProjectOverviewWithChart;
  teams: readonly ProjectTeamProgress[];
  isTeamsLoading: boolean;
  teamsError: unknown;
  onRetryTeams: () => void;
}

/**
 * Project Overview tab (`1:8753`, §3.6, `M16`, `M17`, `M18`):
 * renders verified overview fields only (omitting Project Type) alongside the lazy monthly chart,
 * progress gauge, task statistics, and combined team members card.
 */
export function ProjectOverviewTab({
  project,
  teams,
  isTeamsLoading,
  teamsError,
  onRetryTeams,
}: ProjectOverviewTabProps) {
  const { tasks_statistics: stats, due_date_indicator: due } = project;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left column (2/3) */}
      <div className="space-y-6 lg:col-span-2">
        <Card header={<h2 className="text-lg font-medium text-ink">Description</h2>}>
          <p className="text-sm leading-6 text-heading">
            {project.description && project.description.trim().length > 0
              ? project.description
              : 'No description provided.'}
          </p>
        </Card>

        <Card
          header={
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-medium text-ink">Project overview</h2>
              <span className="text-xs font-medium text-body">{project.chart.year}</span>
            </div>
          }
        >
          <BlockErrorBoundary fallbackMessage="Unable to display the project chart.">
            <Suspense fallback={<ProjectOverviewChartSkeleton />}>
              <LazyProjectOverviewChart data={project.chart.data} />
            </Suspense>
          </BlockErrorBoundary>
        </Card>

        <Card header={<h2 className="text-lg font-medium text-ink">Project Details</h2>}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <IconCircle tone="primary" size="md">
                <Calendar className="h-5 w-5" aria-hidden="true" />
              </IconCircle>
              <div>
                <dt className="text-xs text-body">Start Date</dt>
                <dd className="text-sm font-semibold text-ink">
                  {formatDisplayDate(due.start_date)}
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconCircle tone="orange" size="md">
                <Calendar className="h-5 w-5" aria-hidden="true" />
              </IconCircle>
              <div>
                <dt className="text-xs text-body">Deadline</dt>
                <dd className="text-sm font-semibold text-ink">
                  {formatDisplayDate(due.deadline)}
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconCircle tone="violet" size="md">
                <Flag className="h-5 w-5" aria-hidden="true" />
              </IconCircle>
              <div>
                <dt className="text-xs text-body">Priority</dt>
                <dd className="mt-0.5">
                  <ProjectPriorityBadge priority={project.priority} />
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconCircle tone="teal" size="md">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </IconCircle>
              <div>
                <dt className="text-xs text-body">Status</dt>
                <dd className="mt-0.5">
                  <ProjectStatusText status={project.status} />
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconCircle tone="success" size="md">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
              </IconCircle>
              <div>
                <dt className="text-xs text-body">Total Tasks</dt>
                <dd className="text-sm font-semibold text-ink">{stats.total}</dd>
              </div>
            </div>
          </dl>
        </Card>
      </div>

      {/* Right column (1/3) */}
      <div className="space-y-6 lg:col-span-1">
        <Card header={<h2 className="text-lg font-medium text-ink">Project Progress</h2>}>
          <div className="space-y-5">
            <Gauge
              value={project.progress_percentage}
              label="Project completion"
              caption="Project Completed"
            />

            <ul className="space-y-2.5 text-sm" aria-label="Task breakdown">
              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-heading">
                  <span className="h-2.5 w-2.5 rounded-pill bg-status-pending" aria-hidden="true" />
                  <span>Pending tasks</span>
                </span>
                <span className="font-semibold text-ink">
                  {stats.pending}/{stats.total}
                </span>
              </li>

              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-heading">
                  <span className="h-2.5 w-2.5 rounded-pill bg-primary" aria-hidden="true" />
                  <span>In progress tasks</span>
                </span>
                <span className="font-semibold text-ink">
                  {stats.in_progress}/{stats.total}
                </span>
              </li>

              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-heading">
                  <span className="h-2.5 w-2.5 rounded-pill bg-purple" aria-hidden="true" />
                  <span>In review tasks</span>
                </span>
                <span className="font-semibold text-ink">
                  {stats.in_review}/{stats.total}
                </span>
              </li>

              <li className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-heading">
                  <span className="h-2.5 w-2.5 rounded-pill bg-success" aria-hidden="true" />
                  <span>Completed tasks</span>
                </span>
                <span className="font-semibold text-ink">
                  {stats.completed}/{stats.total}
                </span>
              </li>
            </ul>
          </div>
        </Card>

        <ProjectTeamMembersCard
          directMembers={project.direct_members}
          teams={teams}
          isTeamsLoading={isTeamsLoading}
          teamsError={teamsError}
          onRetryTeams={onRetryTeams}
        />
      </div>
    </div>
  );
}
