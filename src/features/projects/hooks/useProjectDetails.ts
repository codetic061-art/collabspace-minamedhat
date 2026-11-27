import { useQuery } from '@tanstack/react-query';
import { projectsQueries } from '@/shared/api';

/** Parses a route `:projectId` parameter into a valid positive integer or `null`. */
export function parseProjectIdParam(rawId: string | undefined): number | null {
  if (!rawId || !/^\d+$/.test(rawId)) {
    return null;
  }
  const parsed = Number.parseInt(rawId, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Fetches `/projects/{id}/overview` and `/projects/{id}/teams` for Project Details. */
export function useProjectDetails(projectId: number | null) {
  const validId = projectId ?? 0;
  const isEnabled = projectId !== null;

  const overviewQuery = useQuery({
    ...projectsQueries.overview(validId),
    enabled: isEnabled,
  });

  const teamsQuery = useQuery({
    ...projectsQueries.teams(validId),
    enabled: isEnabled,
  });

  return {
    overviewQuery,
    teamsQuery,
  };
}
