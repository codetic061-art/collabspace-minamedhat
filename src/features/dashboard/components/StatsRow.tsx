import type { ReactNode } from 'react';
import { CheckCircle2, Clock, Loader } from 'lucide-react';
import type { DashboardData } from '@/shared/api';
import {
  BlockErrorBoundary,
  BlockErrorState,
  Card,
  Gauge,
  IconCircle,
  ProgressBar,
  Skeleton,
  SkeletonRegion,
  type ProgressTone,
} from '@/shared/ui';
import type { DashboardQueryResult } from '../hooks/useDashboard';

interface StatCardProps {
  title: string;
  value: number;
  total: number;
  percentage: number;
  tone: ProgressTone;
  icon: ReactNode;
}

function StatCard({ title, value, total, percentage, tone, icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium text-ink">{title}</h2>
          <p className="mt-2 text-[31px] font-semibold leading-tight text-ink">{value}</p>
        </div>
        <IconCircle tone={tone} size="md">
          {icon}
        </IconCircle>
      </div>
      <p className="mt-4 text-xs text-body">
        {value}/{total}
      </p>
      <ProgressBar
        value={percentage}
        tone={tone}
        label={`${title} percentage`}
        className="mt-2 h-1.5"
      />
    </Card>
  );
}

interface StatSlotProps {
  query: DashboardQueryResult;
  title: string;
  children: (tasks: DashboardData['overview']['tasks']) => ReactNode;
}

function StatSlotBody({ query, title, children }: StatSlotProps) {
  if (query.isPending) {
    return (
      <Card>
        <SkeletonRegion label={`Loading ${title}`}>
          <div className="space-y-3">
            <Skeleton variant="text" className="w-24" />
            <Skeleton variant="text" className="h-8 w-16" />
            <Skeleton variant="text" />
          </div>
        </SkeletonRegion>
      </Card>
    );
  }

  if (query.isError || !query.data) {
    return <BlockErrorState onRetry={() => void query.refetch()} />;
  }

  return <>{children(query.data.overview.tasks)}</>;
}

function StatSlot({ query, title, children }: StatSlotProps) {
  return (
    <BlockErrorBoundary fallbackTitle={`${title} unavailable`}>
      <StatSlotBody query={query} title={title}>
        {children}
      </StatSlotBody>
    </BlockErrorBoundary>
  );
}

/** Row 1 (`1:8067`): Pending, In Progress, Completed and the Completion Rate gauge. */
export function StatsRow({ query }: { query: DashboardQueryResult }) {
  return (
    <section
      aria-label="Workspace statistics"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatSlot query={query} title="Pending Tasks">
        {(tasks) => (
          <StatCard
            title="Pending Tasks"
            value={tasks.pending}
            total={tasks.total}
            percentage={tasks.pending_percentage}
            tone="orange"
            icon={<Clock className="h-5 w-5" aria-hidden="true" />}
          />
        )}
      </StatSlot>

      <StatSlot query={query} title="In Progress">
        {(tasks) => (
          <StatCard
            title="In Progress"
            value={tasks.in_progress}
            total={tasks.total}
            percentage={tasks.in_progress_percentage}
            tone="primary"
            icon={<Loader className="h-5 w-5" aria-hidden="true" />}
          />
        )}
      </StatSlot>

      <StatSlot query={query} title="Completed">
        {(tasks) => (
          <StatCard
            title="Completed"
            value={tasks.completed}
            total={tasks.total}
            percentage={tasks.completed_percentage}
            tone="success"
            icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          />
        )}
      </StatSlot>

      <StatSlot query={query} title="Completion Rate">
        {(tasks) => (
          <Card className="h-full">
            <h2 className="text-xl font-medium text-ink">Completion Rate</h2>
            <Gauge
              value={tasks.completion_rate}
              label="Overall task completion"
              caption="Tasks completed"
              className="mt-2 grid grid-cols-[1fr_96px] items-center [&>p]:col-start-1 [&>svg]:col-start-2 [&>svg]:row-span-2 [&>svg]:row-start-1 [&>svg]:w-24"
            />
          </Card>
        )}
      </StatSlot>
    </section>
  );
}
