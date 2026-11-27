import { Skeleton, SkeletonRegion } from '@/shared/ui';

/** Loading skeleton mirroring the Project Details header and 2/3 + 1/3 Overview grid (§12.10). */
export function ProjectDetailsSkeleton() {
  return (
    <SkeletonRegion label="Loading project details" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-40" />
          <Skeleton variant="text" className="h-8 w-64" />
        </div>
        <Skeleton variant="rect" className="h-24 w-full sm:w-80" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton variant="card" className="h-32" />
          <Skeleton variant="card" className="h-72" />
          <Skeleton variant="card" className="h-44" />
        </div>
        <div className="space-y-6 lg:col-span-1">
          <Skeleton variant="card" className="h-72" />
          <Skeleton variant="card" className="h-64" />
        </div>
      </div>
    </SkeletonRegion>
  );
}
