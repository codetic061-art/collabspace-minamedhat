import { queryOptions } from '@tanstack/react-query';
import { requestAction, requestJson, type ApiMessageResult } from '../httpClient';
import { normalizeP1, type P1Collection, type PaginatedResult } from '../pagination';
import type {
  ProjectListItem,
  ProjectOverviewResource,
  ProjectPriority,
  ProjectStatus,
  TeamRole,
} from '../types';

export interface ListProjectsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: ProjectStatus | null;
  priority?: ProjectPriority | null;
  sort?: string | null;
}

export interface StoreProjectMemberInput {
  user_id: number;
  role?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  start_date: string;
  deadline: string;
  priority?: ProjectPriority | null;
  status?: ProjectStatus | null;
  teams?: number[] | null;
  members?: StoreProjectMemberInput[] | null;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  start_date?: string;
  deadline?: string;
  priority?: ProjectPriority | null;
  status?: ProjectStatus | null;
  teams?: number[] | null;
}

export type ProjectOverviewPeriod = 'year' | '6_months';

export interface ProjectOverviewParams {
  period?: ProjectOverviewPeriod | null;
  year?: number | null;
}

export interface ProjectOverviewChartPoint {
  month: string;
  month_number: number;
  year: number;
  label: string;
  created_tasks: number;
  completed_tasks: number;
  progress_percentage: number | null;
  is_future: boolean;
}

export interface ProjectOverviewWithChart extends ProjectOverviewResource {
  chart: {
    period: string;
    year: number;
    group_by: string;
    data: ProjectOverviewChartPoint[];
  };
}

export interface ProjectTeamMemberProgress {
  id: number;
  name: string;
  avatar_url: string | null;
  role_in_team: TeamRole;
  is_leader: boolean;
  tasks_completed: number;
  tasks_total: number;
  tasks_ratio: string;
  progress_percentage: number;
}

export interface ProjectTeamProgress {
  id: number;
  name: string;
  completion_percentage: number;
  total_tasks: number;
  completed_tasks: number;
  members: ProjectTeamMemberProgress[];
}

export interface AssignProjectTeamsPayload {
  team_ids: number[];
}

const PROJECTS_PATHS = {
  list: '/projects',
  create: '/projects',
  detail: (projectId: number) => `/projects/${projectId}`,
  overview: (projectId: number) => `/projects/${projectId}/overview`,
  teams: (projectId: number) => `/projects/${projectId}/teams`,
  removeTeam: (projectId: number, teamId: number) => `/projects/${projectId}/teams/${teamId}`,
} as const;

export const projectsKeys = {
  all: ['projects'] as const,
  list: (params: ListProjectsParams = {}): readonly ['projects', 'list', ListProjectsParams] => [
    'projects',
    'list',
    params,
  ],
  detail: (projectId: number): readonly ['projects', 'detail', number] => [
    'projects',
    'detail',
    projectId,
  ],
  overview: (
    projectId: number,
    params: ProjectOverviewParams = {},
  ): readonly ['projects', 'overview', number, ProjectOverviewParams] => [
    'projects',
    'overview',
    projectId,
    params,
  ],
  teams: (projectId: number): readonly ['projects', 'teams', number] => [
    'projects',
    'teams',
    projectId,
  ],
};

/** Lists paginated projects (`GET /projects`, P1 collection). */
export async function listProjects(
  params: ListProjectsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<ProjectListItem>> {
  const collection = await requestJson<P1Collection<ProjectListItem>>(PROJECTS_PATHS.list, {
    query: {
      page: params.page,
      per_page: params.per_page,
      search: params.search,
      status: params.status,
      priority: params.priority,
      sort: params.sort,
    },
    signal,
  });
  return normalizeP1(collection);
}

/** Creates a project (`POST /projects`, 201 Created). */
export function createProject(payload: CreateProjectPayload): Promise<ProjectOverviewResource> {
  return requestJson<ProjectOverviewResource>(PROJECTS_PATHS.create, {
    method: 'POST',
    body: payload,
  });
}

/** Fetches single project details (`GET /projects/{project}`). */
export function getProject(
  projectId: number,
  signal?: AbortSignal,
): Promise<ProjectOverviewResource> {
  return requestJson<ProjectOverviewResource>(PROJECTS_PATHS.detail(projectId), { signal });
}

/** Updates a project (`PUT /projects/{project}`). */
export function updateProject(
  projectId: number,
  payload: UpdateProjectPayload,
): Promise<ProjectOverviewResource> {
  return requestJson<ProjectOverviewResource>(PROJECTS_PATHS.detail(projectId), {
    method: 'PUT',
    body: payload,
  });
}

/** Deletes a project (`DELETE /projects/{project}`, E3; absent from Tier 1 MVP UI per D9). */
export function deleteProject(projectId: number): Promise<ApiMessageResult> {
  return requestAction(PROJECTS_PATHS.detail(projectId), {
    method: 'DELETE',
  });
}

/** Fetches project overview stats, members, teams, and monthly progress chart (`GET /projects/{project}/overview`). */
export function getProjectOverview(
  projectId: number,
  params: ProjectOverviewParams = {},
  signal?: AbortSignal,
): Promise<ProjectOverviewWithChart> {
  return requestJson<ProjectOverviewWithChart>(PROJECTS_PATHS.overview(projectId), {
    query: {
      period: params.period,
      year: params.year,
    },
    signal,
  });
}

/** Lists assigned teams with per-member progress for a project (`GET /projects/{project}/teams`). */
export function getProjectTeams(
  projectId: number,
  signal?: AbortSignal,
): Promise<ProjectTeamProgress[]> {
  return requestJson<ProjectTeamProgress[]>(PROJECTS_PATHS.teams(projectId), { signal });
}

/** Assigns teams to a project (`POST /projects/{project}/teams`). */
export function assignProjectTeams(
  projectId: number,
  payload: AssignProjectTeamsPayload,
): Promise<ProjectOverviewResource> {
  return requestJson<ProjectOverviewResource>(PROJECTS_PATHS.teams(projectId), {
    method: 'POST',
    body: payload,
  });
}

/** Detaches a team from a project (`DELETE /projects/{project}/teams/{team}`). */
export function removeProjectTeam(
  projectId: number,
  teamId: number,
): Promise<ProjectOverviewResource> {
  return requestJson<ProjectOverviewResource>(PROJECTS_PATHS.removeTeam(projectId, teamId), {
    method: 'DELETE',
  });
}

export const projectsQueries = {
  list: (params: ListProjectsParams = {}) =>
    queryOptions({
      queryKey: projectsKeys.list(params),
      queryFn: ({ signal }) => listProjects(params, signal),
    }),
  detail: (projectId: number) =>
    queryOptions({
      queryKey: projectsKeys.detail(projectId),
      queryFn: ({ signal }) => getProject(projectId, signal),
    }),
  overview: (projectId: number, params: ProjectOverviewParams = {}) =>
    queryOptions({
      queryKey: projectsKeys.overview(projectId, params),
      queryFn: ({ signal }) => getProjectOverview(projectId, params, signal),
    }),
  teams: (projectId: number) =>
    queryOptions({
      queryKey: projectsKeys.teams(projectId),
      queryFn: ({ signal }) => getProjectTeams(projectId, signal),
    }),
};
