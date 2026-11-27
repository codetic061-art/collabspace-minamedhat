import { useState } from 'react';
import {
  getErrorMessage,
  toAppError,
  type ProjectDirectMember,
  type ProjectTeamProgress,
} from '@/shared/api';
import { toSafeExternalUrl } from '@/shared/lib';
import {
  Avatar,
  Badge,
  BlockErrorState,
  Card,
  Select,
  Skeleton,
  SkeletonRegion,
  type SelectOption,
} from '@/shared/ui';
import { buildProjectMemberRoster } from '../utils/projectPresentation';

export interface ProjectTeamMembersCardProps {
  directMembers: readonly ProjectDirectMember[];
  teams: readonly ProjectTeamProgress[];
  isTeamsLoading: boolean;
  teamsError: unknown;
  onRetryTeams: () => void;
}

/**
 * Team Members card (`1:8753`, `M18`):
 * merges `direct_members[]` from overview and `members[]` from `/projects/{id}/teams`,
 * filtering by team and rendering `Leader` tags from `is_leader`.
 */
export function ProjectTeamMembersCard({
  directMembers,
  teams,
  isTeamsLoading,
  teamsError,
  onRetryTeams,
}: ProjectTeamMembersCardProps) {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filterOptions: SelectOption[] = [
    { value: 'all', label: 'All Members' },
    ...(directMembers.length > 0 ? [{ value: 'direct', label: 'Direct Members' }] : []),
    ...teams.map((team) => ({ value: `team-${team.id}`, label: team.name })),
  ];

  const activeFilter = filterOptions.some((opt) => opt.value === selectedFilter)
    ? selectedFilter
    : 'all';

  const roster = buildProjectMemberRoster(directMembers, teams, activeFilter);

  const renderBody = () => {
    if (isTeamsLoading && directMembers.length === 0) {
      return (
        <SkeletonRegion label="Loading team members" className="space-y-3">
          <Skeleton variant="text" className="h-10" />
          <Skeleton variant="text" className="h-10" />
          <Skeleton variant="text" className="h-10" />
        </SkeletonRegion>
      );
    }

    if (teamsError && directMembers.length === 0) {
      return (
        <BlockErrorState message={getErrorMessage(toAppError(teamsError))} onRetry={onRetryTeams} />
      );
    }

    if (roster.length === 0) {
      return <p className="py-4 text-sm text-body">No team members assigned yet.</p>;
    }

    return (
      <div className="space-y-3">
        {teamsError ? (
          <BlockErrorState
            message="Could not load team rosters."
            onRetry={onRetryTeams}
            className="py-4"
          />
        ) : null}

        <ul className="divide-y divide-border-subtle" aria-label="Team members">
          {roster.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={member.name} src={toSafeExternalUrl(member.avatarUrl)} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{member.name}</p>
                  <p className="truncate text-xs text-body">{member.roleLabel}</p>
                </div>
              </div>

              {member.isLeader ? <Badge variant="primary">Leader</Badge> : null}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-ink">Team Members</h2>
          <div className="w-40">
            <Select
              label="Filter members by team"
              labelVariant="sr-only"
              variant="minimal"
              options={filterOptions}
              value={activeFilter}
              onChange={setSelectedFilter}
            />
          </div>
        </div>
      }
    >
      {renderBody()}
    </Card>
  );
}
