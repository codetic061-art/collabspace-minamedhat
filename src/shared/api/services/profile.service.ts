import { queryOptions } from '@tanstack/react-query';
import { requestAction, requestJson, type ApiMessageResult } from '../httpClient';
import { normalizeP2, type P2Paginator, type PaginatedResult } from '../pagination';
import type {
  AuditLogCategory,
  AvailabilityStatus,
  EntityRef,
  ProjectPriority,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TeamRole,
  UserResource,
} from '../types';

export interface ProfileRecentActivity {
  id: number;
  category: AuditLogCategory;
  action: string;
  description: string | null;
  created_at: string;
}

export interface ProfileRawTeam {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  pivot: {
    user_id: number;
    team_id: number;
    role_in_team: TeamRole;
    created_at: string;
    updated_at: string;
  };
}

export interface ProfileRawProject {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  deadline: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  progress_percentage: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  pivot: {
    user_id: number;
    project_id: number;
    role: string;
    created_at: string;
    updated_at: string;
  };
}

/** Verified `/auth/me` payload (`#profile-me`). */
export interface ProfileMeData {
  user: UserResource & { current_project: EntityRef | null };
  stats: {
    completed_tasks: number;
    total_tasks: number;
    hours_worked: number;
  };
  recent_activities: ProfileRecentActivity[];
  teams: ProfileRawTeam[];
  projects: ProfileRawProject[];
}

export interface ProfileTasksParams {
  page?: number;
  per_page?: number;
}

/** Raw Eloquent task returned inside `GET /auth/profile/tasks` (`P2`, `ISO-Z` timestamps). */
export interface ProfileRawTask {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  team_id: number | null;
  assigned_to: number | null;
  created_by: number;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  hours_spent: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  project: {
    id: number;
    name: string;
    description: string | null;
    start_date: string;
    deadline: string;
    priority: ProjectPriority;
    status: ProjectStatus;
    progress_percentage: number;
    created_by: number;
    created_at: string;
    updated_at: string;
  };
  team: {
    id: number;
    name: string;
    description: string | null;
    created_by: number;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface UpdateProfilePayload {
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  job_title?: string | null;
  about?: string | null;
  years_of_experience?: number | null;
  phone?: string | null;
  available_status?: AvailabilityStatus | null;
  current_project_id?: number | null;
  avatar_url?: string | null;
  avatar?: File | null;
  old_password?: string | null;
  new_password?: string | null;
  confirmation_password?: string | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

const PROFILE_PATHS = {
  me: '/auth/me',
  update: '/auth/profile',
  avatar: '/auth/profile/avatar',
  password: '/auth/password',
  tasks: '/auth/profile/tasks',
} as const;

export const profileKeys = {
  all: ['auth'] as const,
  me: (): readonly ['auth', 'me'] => ['auth', 'me'],
  tasks: (
    params: ProfileTasksParams = {},
  ): readonly ['auth', 'profile', 'tasks', ProfileTasksParams] => [
    'auth',
    'profile',
    'tasks',
    params,
  ],
};

/** Restores the authenticated user profile, stats, teams, projects, and activities (`GET /auth/me`). */
export function getMe(signal?: AbortSignal): Promise<ProfileMeData> {
  return requestJson<ProfileMeData>(PROFILE_PATHS.me, { signal });
}

/** Updates profile fields and/or uploads an avatar via `POST /auth/profile` multipart form-data. */
export function updateProfile(payload: UpdateProfilePayload): Promise<UserResource> {
  const formData = new FormData();

  if (payload.avatar instanceof File) {
    formData.append('avatar', payload.avatar);
  }

  const scalarEntries: Array<[string, string | number | null | undefined]> = [
    ['full_name', payload.full_name],
    ['name', payload.name],
    ['email', payload.email],
    ['job_title', payload.job_title],
    ['about', payload.about],
    ['years_of_experience', payload.years_of_experience],
    ['phone', payload.phone],
    ['available_status', payload.available_status],
    ['current_project_id', payload.current_project_id],
    ['avatar_url', payload.avatar_url],
    ['old_password', payload.old_password],
    ['new_password', payload.new_password],
    ['confirmation_password', payload.confirmation_password],
  ];

  for (const [key, value] of scalarEntries) {
    if (value === undefined || value === null) {
      continue;
    }
    formData.append(key, String(value));
  }

  return requestJson<UserResource>(PROFILE_PATHS.update, {
    method: 'POST',
    body: formData,
  });
}

/** Deletes the current avatar (`DELETE /auth/profile/avatar`). */
export function removeAvatar(): Promise<UserResource> {
  return requestJson<UserResource>(PROFILE_PATHS.avatar, {
    method: 'DELETE',
  });
}

/** Changes the authenticated user's password (`PUT /auth/password`, E3). */
export function changePassword(payload: ChangePasswordPayload): Promise<ApiMessageResult> {
  return requestAction(PROFILE_PATHS.password, {
    method: 'PUT',
    body: payload,
  });
}

/** Lists tasks assigned to the authenticated user (`GET /auth/profile/tasks`, P2 paginator). */
export async function getProfileTasks(
  params: ProfileTasksParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<ProfileRawTask>> {
  const rawPaginator = await requestJson<P2Paginator<ProfileRawTask>>(PROFILE_PATHS.tasks, {
    query: {
      page: params.page,
      per_page: params.per_page,
    },
    signal,
  });
  return normalizeP2(rawPaginator);
}

export const profileQueries = {
  me: () =>
    queryOptions({
      queryKey: profileKeys.me(),
      queryFn: ({ signal }) => getMe(signal),
      staleTime: Number.POSITIVE_INFINITY,
    }),
  tasks: (params: ProfileTasksParams = {}) =>
    queryOptions({
      queryKey: profileKeys.tasks(params),
      queryFn: ({ signal }) => getProfileTasks(params, signal),
    }),
};
