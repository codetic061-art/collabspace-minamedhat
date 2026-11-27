import { CalendarDays } from 'lucide-react';
import { formatDisplayDate, formatDisplayTime } from '@/shared/api/dates';
import { toSafeExternalUrl } from '@/shared/lib/safeUrl';
import { AvatarStack } from '@/shared/ui/Avatar';
import { Skeleton } from '@/shared/ui/StatePrimitives';
import type { DashboardQueryResult } from '../hooks/useDashboard';
import { DashboardSection } from './DashboardSection';

/**
 * Upcoming meetings card: read-only from the dashboard response (`upcoming_meetings.items`).
 * No meetings-list request and no "View All" link (M33).
 */
export function MeetingsCard({
  query,
  className,
}: {
  query: DashboardQueryResult;
  className?: string;
}) {
  return (
    <DashboardSection
      query={query}
      title="Upcoming meetings"
      className={className}
      isEmpty={(data) => data.upcoming_meetings.items.length === 0}
      emptyMessage="No upcoming meetings."
      skeleton={
        <div className="space-y-3">
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      }
    >
      {(data) => (
        <ul className="space-y-3">
          {data.upcoming_meetings.items.map((meeting) => (
            <li key={meeting.id} className="rounded-card border border-border-subtle p-3">
              <p className="text-sm font-medium text-ink">{meeting.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatDisplayDate(meeting.date)}
                </span>
                <span>
                  {formatDisplayTime(meeting.start_time)} - {formatDisplayTime(meeting.end_time)}
                </span>
              </div>
              {meeting.participants.length > 0 ? (
                <div className="mt-2">
                  <AvatarStack
                    items={meeting.participants.map((participant) => ({
                      id: participant.id,
                      name: participant.name,
                      src: toSafeExternalUrl(participant.avatar_url),
                    }))}
                    max={3}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
