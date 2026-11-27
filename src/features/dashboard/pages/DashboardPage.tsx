import { toAppError } from '@/shared/api/errors';
import { AccessDeniedState } from '@/shared/ui/StatePrimitives';
import { ActiveProjectsCard } from '../components/ActiveProjectsCard';
import { MeetingsCard } from '../components/MeetingsCard';
import { ProjectOverviewCard } from '../components/ProjectOverviewCard';
import { RecentFilesCard } from '../components/RecentFilesCard';
import { StatsRow } from '../components/StatsRow';
import { TasksCard } from '../components/TasksCard';
import { TeamsCard } from '../components/TeamsCard';
import { useDashboard } from '../hooks/useDashboard';

/**
 * Dashboard page (`1:8065`, ID-5). Calls the one dashboard query and passes its slices to
 * each card. 401 is owned by the session layer, 403 renders the page-level access-denied
 * state, and every other failure stays isolated inside the individual cards.
 */
export function DashboardPage() {
  const query = useDashboard();

  if (query.isError) {
    const kind = toAppError(query.error).kind;
    if (kind === 'unauthorized') {
      return null;
    }
    if (kind === 'forbidden') {
      return <AccessDeniedState />;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Dashboard</h1>

      <StatsRow query={query} />

      <section
        aria-label="Workspace overview"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
      >
        <ProjectOverviewCard query={query} className="md:col-span-2" />
        <ActiveProjectsCard query={query} />
        <RecentFilesCard query={query} />
        <TasksCard query={query} />
        <TeamsCard query={query} />
        <MeetingsCard query={query} className="md:col-span-2" />
      </section>
    </div>
  );
}
