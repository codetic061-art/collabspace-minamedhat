import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import type { ProjectStatus } from '@/shared/api';
import { PROJECT_STATUSES } from '../utils/projectPresentation';

export const PROJECTS_PAGE_SIZE = 15;
export const PROJECTS_SORT_NEWEST = 'newest' as const;

export interface ProjectsListUrlState {
  page: number;
  search: string;
  status: ProjectStatus | null;
  sort: typeof PROJECTS_SORT_NEWEST;
}

const VALID_STATUS_SET = new Set<string>(PROJECT_STATUSES);

function parsePositivePage(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw)) {
    return 1;
  }
  const parsed = Number.parseInt(raw, 10);
  return parsed > 0 ? parsed : 1;
}

function parseProjectStatus(raw: string | null): ProjectStatus | null {
  if (!raw || !VALID_STATUS_SET.has(raw)) {
    return null;
  }
  return raw as ProjectStatus; // Narrowed by VALID_STATUS_SET membership check.
}

function buildSearchParams(next: ProjectsListUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (next.search.trim().length > 0) {
    params.set('search', next.search.trim());
  }
  if (next.status) {
    params.set('status', next.status);
  }
  params.set('sort', next.sort);
  if (next.page > 1) {
    params.set('page', String(next.page));
  }
  return params;
}

/**
 * Synchronizes Projects list filters (`search`, `status`, `sort=newest`, `page`) with URL search params
 * so filtered views remain shareable and survive reloads (ID-5, ID-17, M25).
 */
export function useProjectsListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePositivePage(searchParams.get('page'));
  const search = searchParams.get('search') ?? '';
  const status = parseProjectStatus(searchParams.get('status'));
  const rawSort = searchParams.get('sort');

  useEffect(() => {
    if (rawSort !== PROJECTS_SORT_NEWEST) {
      setSearchParams(
        buildSearchParams({
          page,
          search,
          status,
          sort: PROJECTS_SORT_NEWEST,
        }),
        { replace: true },
      );
    }
  }, [rawSort, page, search, status, setSearchParams]);

  const setSearch = useCallback(
    (nextSearch: string) => {
      setSearchParams(
        buildSearchParams({
          page: 1,
          search: nextSearch,
          status,
          sort: PROJECTS_SORT_NEWEST,
        }),
      );
    },
    [setSearchParams, status],
  );

  const setStatus = useCallback(
    (nextStatus: ProjectStatus | null) => {
      setSearchParams(
        buildSearchParams({
          page: 1,
          search,
          status: nextStatus,
          sort: PROJECTS_SORT_NEWEST,
        }),
      );
    },
    [search, setSearchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(
        buildSearchParams({
          page: Math.max(1, nextPage),
          search,
          status,
          sort: PROJECTS_SORT_NEWEST,
        }),
      );
    },
    [search, setSearchParams, status],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      buildSearchParams({
        page: 1,
        search: '',
        status: null,
        sort: PROJECTS_SORT_NEWEST,
      }),
    );
  }, [setSearchParams]);

  return {
    page,
    search,
    status,
    sort: PROJECTS_SORT_NEWEST,
    hasActiveFilters: search.trim().length > 0 || status !== null,
    setSearch,
    setStatus,
    setPage,
    clearFilters,
  };
}
