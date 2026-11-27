import { useQuery } from '@tanstack/react-query';
import { teamsQueries } from '@/shared/api/services/teams.service';

/**
 * Loads the selected team's members on demand (`GET /teams/{team}`, `#teams-show`).
 * The query stays disabled until the user picks a team, so the Dashboard's initial load
 * never issues an extra Teams request (ID-18, M15).
 */
export function useTeamMembers(teamId: number | null) {
  const validTeamId = teamId !== null && teamId > 0 ? teamId : -1;

  return useQuery({
    ...teamsQueries.detail(validTeamId),
    enabled: validTeamId > 0,
  });
}
