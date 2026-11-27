import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { usersQueries } from '@/shared/api';
import { filterUsersByQuery } from '../utils/projectPresentation';

export const USER_PICKER_PAGE_SIZE = 20;
const USER_SEARCH_DEBOUNCE_MS = 250;

export interface UseUserSearchPickerOptions {
  enabled: boolean;
  searchTerm: string;
}

/**
 * Loads `/users` options on demand (`enabled: isOpen`) with `per_page=20`, debounced `search`,
 * and client-side substring filtering as fallback when server search is unsupported (D5, M28).
 */
export function useUserSearchPicker({ enabled, searchTerm }: UseUserSearchPickerOptions) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, USER_SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const trimmedSearch = debouncedSearch.trim();

  const usersQuery = useQuery({
    ...usersQueries.list({
      page,
      per_page: USER_PICKER_PAGE_SIZE,
      search: trimmedSearch.length > 0 ? trimmedSearch : undefined,
    }),
    enabled,
    placeholderData: keepPreviousData,
  });

  const rawItems = usersQuery.data?.items ?? [];
  const filteredUsers = filterUsersByQuery(rawItems, trimmedSearch);

  return {
    users: filteredUsers,
    rawTotal: usersQuery.data?.total ?? 0,
    currentPage: usersQuery.data?.currentPage ?? page,
    lastPage: usersQuery.data?.lastPage ?? 1,
    isLoading: usersQuery.isPending,
    isFetching: usersQuery.isFetching,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    setPage,
  };
}
