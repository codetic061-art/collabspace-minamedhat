import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { projectsQueries, type ListProjectsParams } from '@/shared/api';
import { PROJECTS_PAGE_SIZE, PROJECTS_SORT_NEWEST } from './useProjectsListParams';

export interface UseProjectsListInput {
  page: number;
  search: string;
  status: ListProjectsParams['status'];
}

/** Fetches paginated projects (`GET /projects`) preserving previous page data during transitions (ID-18). */
export function useProjectsList({ page, search, status }: UseProjectsListInput) {
  const trimmedSearch = search.trim();
  const queryParams: ListProjectsParams = {
    page,
    per_page: PROJECTS_PAGE_SIZE,
    search: trimmedSearch.length > 0 ? trimmedSearch : undefined,
    status: status ?? undefined,
    sort: PROJECTS_SORT_NEWEST,
  };

  return useQuery({
    ...projectsQueries.list(queryParams),
    placeholderData: keepPreviousData,
  });
}
