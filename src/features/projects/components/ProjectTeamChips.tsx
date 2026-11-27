import type { EntityRef } from '@/shared/api';
import { Badge } from '@/shared/ui';

export interface ProjectTeamChipsProps {
  teams: readonly EntityRef[];
}

/** Renders up to two team name chips followed by a `+N` overflow chip (M19). */
export function ProjectTeamChips({ teams }: ProjectTeamChipsProps) {
  if (teams.length === 0) {
    return <span className="text-sm text-body">—</span>;
  }

  const visibleTeams = teams.slice(0, 2);
  const remainingTeams = teams.slice(2);
  const overflowCount = remainingTeams.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleTeams.map((team) => (
        <Badge key={team.id} variant="neutral">
          {team.name}
        </Badge>
      ))}
      {overflowCount > 0 ? (
        <Badge
          variant="primary"
          title={remainingTeams.map((team) => team.name).join(', ')}
          aria-label={`${overflowCount} more teams: ${remainingTeams.map((team) => team.name).join(', ')}`}
        >
          +{overflowCount}
        </Badge>
      ) : null}
    </div>
  );
}
