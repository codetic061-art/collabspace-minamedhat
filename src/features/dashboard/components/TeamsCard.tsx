import { useState } from 'react';
import { getErrorMessage, toAppError } from '@/shared/api/errors';
import { toSafeExternalUrl } from '@/shared/lib/safeUrl';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { BlockErrorBoundary } from '@/shared/ui/BlockErrorBoundary';
import { NativeSelect } from '@/shared/ui/Select';
import { BlockErrorState, EmptyState, Skeleton, SkeletonRegion } from '@/shared/ui/StatePrimitives';
import type { DashboardQueryResult } from '../hooks/useDashboard';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { DashboardCard } from './DashboardSection';

/**
 * Teams card (M15): the dropdown is filled from `teams.items` in the dashboard response.
 * Selecting a team is the only interaction that fetches `GET /teams/{team}` for its
 * members. No member/project ratio or invented progress value is shown.
 */
export function TeamsCard({
  query,
  className,
}: {
  query: DashboardQueryResult;
  className?: string;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  return (
    <BlockErrorBoundary fallbackTitle="Teams unavailable">
      <DashboardCard title="Teams" className={className}>
        <TeamsCardBody
          query={query}
          selectedTeamId={selectedTeamId}
          onSelectTeam={setSelectedTeamId}
        />
      </DashboardCard>
    </BlockErrorBoundary>
  );
}

interface TeamsCardBodyProps {
  query: DashboardQueryResult;
  selectedTeamId: number | null;
  onSelectTeam: (teamId: number | null) => void;
}

function TeamsCardBody({ query, selectedTeamId, onSelectTeam }: TeamsCardBodyProps) {
  if (query.isPending) {
    return (
      <SkeletonRegion label="Loading teams">
        <div className="space-y-3">
          <Skeleton variant="text" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      </SkeletonRegion>
    );
  }

  if (query.isError || !query.data) {
    return <BlockErrorState onRetry={() => void query.refetch()} />;
  }

  const teams = query.data.teams.items;
  if (teams.length === 0) {
    return <EmptyState message="No teams yet." />;
  }

  return (
    <div className="space-y-4">
      <NativeSelect
        aria-label="Select a team"
        placeholder="Select a team"
        value={selectedTeamId === null ? '' : String(selectedTeamId)}
        onChange={(event) => onSelectTeam(event.target.value ? Number(event.target.value) : null)}
        options={teams.map((team) => ({ value: String(team.id), label: team.name }))}
      />
      {selectedTeamId === null ? (
        <p className="text-sm text-body">Select a team to see its members.</p>
      ) : (
        <TeamMembers teamId={selectedTeamId} />
      )}
    </div>
  );
}

function TeamMembers({ teamId }: { teamId: number }) {
  const membersQuery = useTeamMembers(teamId);

  if (membersQuery.isPending) {
    return (
      <SkeletonRegion label="Loading team members">
        <div className="space-y-3">
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      </SkeletonRegion>
    );
  }

  if (membersQuery.isError || !membersQuery.data) {
    const appError = toAppError(membersQuery.error);
    if (appError.kind === 'unauthorized') {
      return null;
    }
    const canRetry = appError.kind !== 'forbidden' && appError.kind !== 'not_found';
    return (
      <BlockErrorState
        message={getErrorMessage(appError)}
        onRetry={canRetry ? () => void membersQuery.refetch() : undefined}
      />
    );
  }

  const members = membersQuery.data.members;
  if (members.length === 0) {
    return <p className="text-sm text-body">This team has no members.</p>;
  }

  return (
    <ul className="space-y-3">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3">
          <Avatar name={member.name} src={toSafeExternalUrl(member.avatar_url)} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{member.name}</p>
            <p className="truncate text-xs text-body">{member.role_in_team}</p>
          </div>
          {member.is_leader ? <Badge variant="primary">Leader</Badge> : null}
        </li>
      ))}
    </ul>
  );
}
