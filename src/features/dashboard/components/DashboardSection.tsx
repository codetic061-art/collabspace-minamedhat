import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { DashboardData } from '@/shared/api';
import { BlockErrorBoundary, BlockErrorState, Card, EmptyState, SkeletonRegion } from '@/shared/ui';
import type { DashboardQueryResult } from '../hooks/useDashboard';

const VIEW_ALL_LINK_CLASS =
  'shrink-0 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary';

export function DashboardViewAllLink({ to }: { to: string }) {
  return (
    <Link to={to} className={VIEW_ALL_LINK_CLASS}>
      View All
    </Link>
  );
}

export interface DashboardCardProps {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Card frame shared by every Dashboard section: one `h2` title, optional header action. */
export function DashboardCard({ title, action, className, children }: DashboardCardProps) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export interface DashboardSectionProps {
  query: DashboardQueryResult;
  title: string;
  action?: ReactNode;
  className?: string;
  isEmpty: (data: DashboardData) => boolean;
  emptyMessage: string;
  skeleton: ReactNode;
  children: (data: DashboardData) => ReactNode;
}

/**
 * Renders one Dashboard section from the shared dashboard query with flat, independent
 * loading, error, empty and success states. A rendering crash is isolated by its own
 * block boundary so one broken card cannot blank the rest of the Dashboard (ID-17, ID-23).
 */
export function DashboardSection({
  query,
  title,
  action,
  className,
  isEmpty,
  emptyMessage,
  skeleton,
  children,
}: DashboardSectionProps) {
  return (
    <BlockErrorBoundary fallbackTitle={`${title} unavailable`}>
      <DashboardCard title={title} action={action} className={className}>
        <DashboardSectionBody
          query={query}
          title={title}
          isEmpty={isEmpty}
          emptyMessage={emptyMessage}
          skeleton={skeleton}
        >
          {children}
        </DashboardSectionBody>
      </DashboardCard>
    </BlockErrorBoundary>
  );
}

interface DashboardSectionBodyProps {
  query: DashboardQueryResult;
  title: string;
  isEmpty: (data: DashboardData) => boolean;
  emptyMessage: string;
  skeleton: ReactNode;
  children: (data: DashboardData) => ReactNode;
}

function DashboardSectionBody({
  query,
  title,
  isEmpty,
  emptyMessage,
  skeleton,
  children,
}: DashboardSectionBodyProps) {
  if (query.isPending) {
    return <SkeletonRegion label={`Loading ${title}`}>{skeleton}</SkeletonRegion>;
  }

  if (query.isError || !query.data) {
    return <BlockErrorState onRetry={() => void query.refetch()} />;
  }

  if (isEmpty(query.data)) {
    return <EmptyState message={emptyMessage} />;
  }

  return <>{children(query.data)}</>;
}
