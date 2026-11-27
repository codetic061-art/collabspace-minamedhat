import { FileText } from 'lucide-react';
import { formatDisplayDate } from '@/shared/api';
import { IconCircle, Skeleton } from '@/shared/ui';
import type { DashboardQueryResult } from '../hooks/useDashboard';
import { DashboardSection } from './DashboardSection';

/**
 * Recent Files card: read-only from the dashboard response (`recent_files.items`).
 * `download_url` is not rendered and no download action is offered until D10 confirms the
 * authentication contract, so the Dashboard cannot emit an unsafe direct file link.
 */
export function RecentFilesCard({
  query,
  className,
}: {
  query: DashboardQueryResult;
  className?: string;
}) {
  return (
    <DashboardSection
      query={query}
      title="Recent Files"
      className={className}
      isEmpty={(data) => data.recent_files.items.length === 0}
      emptyMessage="No recent files."
      skeleton={
        <div className="space-y-3">
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      }
    >
      {(data) => (
        <ul className="divide-y divide-border-subtle">
          {data.recent_files.items.map((file) => (
            <li key={file.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <IconCircle tone="primary" size="sm">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </IconCircle>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <p className="text-xs text-body">By {file.uploaded_by.name}</p>
                <p className="text-xs text-body">
                  {formatDisplayDate(file.created_at)} · {file.file_size_formatted}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
