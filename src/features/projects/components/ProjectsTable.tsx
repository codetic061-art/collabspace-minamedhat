import { FileText, FolderKanban } from 'lucide-react';
import { Link } from 'react-router';
import { formatDisplayDate, type ProjectListItem } from '@/shared/api';
import { Card, IconCircle } from '@/shared/ui';
import { getProjectAccentTone } from '../utils/projectPresentation';
import { ProjectPriorityBadge, ProjectStatusText } from './ProjectBadges';
import { ProjectTeamChips } from './ProjectTeamChips';

export interface ProjectsTableProps {
  projects: readonly ProjectListItem[];
  isRefreshing?: boolean;
}

function formatFilesCount(count: number): string {
  return `${count} ${count === 1 ? 'File' : 'Files'}`;
}

/**
 * Renders All Projects (`1:8545`, §12.11):
 * separated white row bars on tablet/desktop (`>= 768px`) and stacked cards on mobile (`< 768px`).
 */
export function ProjectsTable({ projects, isRefreshing = false }: ProjectsTableProps) {
  return (
    <div aria-busy={isRefreshing || undefined}>
      {/* Desktop & tablet table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-3 text-left">
          <thead className="border-b border-border-neutral">
            <tr className="border-b border-border-neutral text-lg font-medium text-heading">
              <th scope="col" className="px-2.5 pb-2 pt-1 font-medium">
                Project Name
              </th>
              <th scope="col" className="px-2.5 pb-2 pt-1 font-medium">
                Start Date
              </th>
              <th scope="col" className="px-2.5 pb-2 pt-1 font-medium">
                Deadline
              </th>
              <th scope="col" className="px-2.5 pb-2 pt-1 font-medium">
                Status
              </th>
              <th scope="col" className="px-2.5 pb-2 pt-1 font-medium">
                Files
              </th>
              <th scope="col" className="px-2.5 pb-2 pt-1 font-medium">
                Teams
              </th>
              <th scope="col" className="px-2.5 pb-2 pt-1 font-medium">
                Priority
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="bg-surface text-sm text-ink transition-colors hover:bg-surface-input/70"
              >
                <td className="rounded-l-card px-5 py-3.5">
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex min-h-touch items-center gap-3 font-medium text-ink hover:text-primary"
                  >
                    <IconCircle tone={getProjectAccentTone(project.id)} size="sm">
                      <FolderKanban className="h-4 w-4" aria-hidden="true" />
                    </IconCircle>
                    <span className="truncate max-w-56">{project.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-heading">
                  {formatDisplayDate(project.start_date)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-heading">
                  {formatDisplayDate(project.deadline)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <ProjectStatusText status={project.status} />
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-heading">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-body" aria-hidden="true" />
                    <span>{formatFilesCount(project.files_count)}</span>
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <ProjectTeamChips teams={project.teams} />
                </td>
                <td className="rounded-r-card px-5 py-3.5 whitespace-nowrap">
                  <ProjectPriorityBadge priority={project.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list (< 768px per §12.11) */}
      <ul className="space-y-3 md:hidden" aria-label="Projects list">
        {projects.map((project) => (
          <li key={project.id}>
            <Card className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to={`/projects/${project.id}`}
                  className="inline-flex min-h-touch items-center gap-3 font-medium text-ink hover:text-primary"
                >
                  <IconCircle tone={getProjectAccentTone(project.id)} size="sm">
                    <FolderKanban className="h-4 w-4" aria-hidden="true" />
                  </IconCircle>
                  <span>{project.name}</span>
                </Link>
                <ProjectPriorityBadge priority={project.priority} />
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-body">Start Date</dt>
                  <dd className="font-medium text-ink">{formatDisplayDate(project.start_date)}</dd>
                </div>
                <div>
                  <dt className="text-body">Deadline</dt>
                  <dd className="font-medium text-ink">{formatDisplayDate(project.deadline)}</dd>
                </div>
                <div>
                  <dt className="text-body">Status</dt>
                  <dd className="mt-0.5">
                    <ProjectStatusText status={project.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-body">Files</dt>
                  <dd className="mt-0.5 inline-flex items-center gap-1 font-medium text-ink">
                    <FileText className="h-3.5 w-3.5 text-body" aria-hidden="true" />
                    <span>{formatFilesCount(project.files_count)}</span>
                  </dd>
                </div>
              </dl>

              <div className="pt-1 border-t border-border-subtle">
                <span className="sr-only">Teams:</span>
                <ProjectTeamChips teams={project.teams} />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
