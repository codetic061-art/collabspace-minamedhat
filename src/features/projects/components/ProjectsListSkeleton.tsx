import { Skeleton, SkeletonRegion } from '@/shared/ui';

/** Row-shaped skeleton placeholders matching All Projects table bars (§12.10, ID-23). */
export function ProjectsListSkeleton() {
  return (
    <SkeletonRegion label="Loading projects" className="space-y-3">
      <Skeleton variant="row" />
      <Skeleton variant="row" />
      <Skeleton variant="row" />
      <Skeleton variant="row" />
      <Skeleton variant="row" />
    </SkeletonRegion>
  );
}
