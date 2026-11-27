import { FolderKanban } from 'lucide-react';
import { Link } from 'react-router';
import { IconCircle, ProgressBar, Skeleton } from '@/shared/ui';
import type { DashboardQueryResult } from '../hooks/useDashboard';
import { projectAccent } from '../utils/projectAccent';
import { DashboardSection, DashboardViewAllLink } from './DashboardSection';

/** Active Projects card: real project progress plus task counts when the API supplies them. */
export function ActiveProjectsCard({
  query,
  className,
}: {
  query: DashboardQueryResult;
  className?: string;
}) {
  return (
    <DashboardSection
      query={query}
      title="Active Projects"
      action={<DashboardViewAllLink to="/projects" />}
      className={className}
      isEmpty={(data) => data.active_projects.items.length === 0}
      emptyMessage="No active projects yet."
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
          {data.active_projects.items.map((project) => {
            const accent = projectAccent(project.id);
            const hasTaskCounts = project.tasks_total !== null && project.tasks_completed !== null;
            return (
              <li
                key={project.id}
                className="rounded-card border border-border-subtle transition-colors hover:border-border-input"
              >
                <Link to={`/projects/${project.id}`} className="flex items-center gap-3 p-3">
                  <IconCircle tone={accent} size="md">
                    <FolderKanban className="h-5 w-5" aria-hidden="true" />
                  </IconCircle>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{project.name}</p>
                    <ProgressBar
                      value={project.progress}
                      tone={accent}
                      label={`${project.name} progress`}
                      className="mt-2"
                    />
                    {hasTaskCounts ? (
                      <p className="mt-1 text-xs text-body">
                        Tasks: {project.tasks_completed} / {project.tasks_total}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
