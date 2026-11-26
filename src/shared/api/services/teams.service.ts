import { queryOptions } from '@tanstack/react-query';
import { requestJson } from '../httpClient';
import { normalizeP1, type P1Collection, type PaginatedResult } from '../pagination';
import type { TeamResource, TeamRole } from '../types';

export interface ListTeamsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface TeamRoleOption {
  value: TeamRole;
  is_leader: boolean;
}

export interface TeamRolesPayload {
  roles: TeamRoleOption[];
  default: TeamRole;
}

const TEAMS_PATHS = {
  roles: '/team-roles',
  list: '/teams',
  detail: (teamId: number) => `/teams/${teamId}`,
} as const;

export const teamsKeys = {
  all: ['teams'] as const,
  roles: (): readonly ['teams', 'roles'] => ['teams', 'roles'],
  list: (params: ListTeamsParams = {}): readonly ['teams', 'list', ListTeamsParams] => [
    'teams',
    'list',
    params,
  ],
  detail: (teamId: number): readonly ['teams', 'detail', number] => ['teams', 'detail', teamId],
};

/** Retrieves the 19 valid `role_in_team` options and leader flags (`GET /team-roles`). */
export function getTeamRoles(signal?: AbortSignal): Promise<TeamRolesPayload> {
  return requestJson<TeamRolesPayload>(TEAMS_PATHS.roles, { signal });
}

/** Lists paginated teams (`GET /teams`, P1 collection). */
export async function listTeams(
  params: ListTeamsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<TeamResource>> {
  const collection = await requestJson<P1Collection<TeamResource>>(TEAMS_PATHS.list, {
    query: {
      page: params.page,
      per_page: params.per_page,
      search: params.search,
    },
    signal,
  });
  return normalizeP1(collection);
}

/** Fetches single team details (`GET /teams/{team}`). */
export function getTeam(teamId: number, signal?: AbortSignal): Promise<TeamResource> {
  return requestJson<TeamResource>(TEAMS_PATHS.detail(teamId), { signal });
}

export const teamsQueries = {
  roles: () =>
    queryOptions({
      queryKey: teamsKeys.roles(),
      queryFn: ({ signal }) => getTeamRoles(signal),
    }),
  list: (params: ListTeamsParams = {}) =>
    queryOptions({
      queryKey: teamsKeys.list(params),
      queryFn: ({ signal }) => listTeams(params, signal),
    }),
  detail: (teamId: number) =>
    queryOptions({
      queryKey: teamsKeys.detail(teamId),
      queryFn: ({ signal }) => getTeam(teamId, signal),
    }),
};
