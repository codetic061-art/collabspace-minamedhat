import { Skeleton, SkeletonRegion } from '@/shared/ui';

/** Suspense placeholder matching the Project overview chart area (`ADR-07`, `ADR-09`). */
export function ProjectOverviewChartSkeleton() {
  return (
    <SkeletonRegion label="Loading project chart">
      <Skeleton variant="rect" className="h-64" />
    </SkeletonRegion>
  );
}
