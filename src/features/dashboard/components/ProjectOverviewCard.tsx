import { lazy, Suspense } from 'react';
import { BlockErrorBoundary } from '@/shared/ui/BlockErrorBoundary';
import { Skeleton, SkeletonRegion } from '@/shared/ui/StatePrimitives';
import type { DashboardQueryResult } from '../hooks/useDashboard';
import { DashboardSection } from './DashboardSection';

/**
 * Module-top-level lazy import keeps the chart library out of the initial bundle and
 * out of every non-Dashboard route (ID-18, ADR-09).
 */
const ProjectOverviewChart = lazy(() => import('./ProjectOverviewChart'));

export interface ProjectOverviewCardProps {
  query: DashboardQueryResult;
  className?: string;
}

/** Project overview area chart card: created vs. completed tasks per month, no filters. */
export function ProjectOverviewCard({ query, className }: ProjectOverviewCardProps) {
  return (
    <DashboardSection
      query={query}
      title="Project overview"
      className={className}
      isEmpty={(data) => data.project_overview.data.length === 0}
      emptyMessage="No project activity for this period yet."
      skeleton={<Skeleton variant="card" />}
    >
      {(data) => (
        <Suspense
          fallback={
            <SkeletonRegion label="Loading chart">
              <Skeleton variant="card" />
            </SkeletonRegion>
          }
        >
          <BlockErrorBoundary fallbackTitle="Chart unavailable">
            <ProjectOverviewChart
              points={data.project_overview.data}
              year={data.project_overview.year}
            />
          </BlockErrorBoundary>
        </Suspense>
      )}
    </DashboardSection>
  );
}
