import { queryOptions } from '@tanstack/react-query';
import { requestEnvelope, requestJson } from '../httpClient';
import { normalizeP4, type P4Meta, type PaginatedResult } from '../pagination';
import type { UserResource } from '../types';

export interface ListUsersParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
}

const USERS_PATHS = {
  list: '/users',
  detail: (userId: number) => `/users/${userId}`,
} as const;

export const usersKeys = {
  all: ['users'] as const,
  list: (params: ListUsersParams = {}): readonly ['users', 'list', ListUsersParams] => [
    'users',
    'list',
    params,
  ],
  detail: (userId: number): readonly ['users', 'detail', number] => ['users', 'detail', userId],
};

/**
 * Lists workspace users (`GET /users`, E2 no-`message` envelope + P4 sibling `meta`).
 * Verified `200 OK` for Admin & Project Manager (`D10`); Team Member remains `UNVERIFIED` (`D6`).
 */
export async function listUsers(
  params: ListUsersParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<UserResource>> {
  const envelope = await requestEnvelope<{
    success: true;
    data: UserResource[];
    meta: P4Meta;
  }>(USERS_PATHS.list, {
    query: {
      page: params.page,
      per_page: params.per_page,
      search: params.search,
      role: params.role,
    },
    signal,
  });

  return normalizeP4({
    data: envelope.data,
    meta: envelope.meta,
  });
}

/** Fetches a single user (`GET /users/{user}`, E2 no-`message` envelope). */
export function getUser(userId: number, signal?: AbortSignal): Promise<UserResource> {
  return requestJson<UserResource>(USERS_PATHS.detail(userId), { signal });
}

export const usersQueries = {
  list: (params: ListUsersParams = {}) =>
    queryOptions({
      queryKey: usersKeys.list(params),
      queryFn: ({ signal }) => listUsers(params, signal),
    }),
  detail: (userId: number) =>
    queryOptions({
      queryKey: usersKeys.detail(userId),
      queryFn: ({ signal }) => getUser(userId, signal),
    }),
};
