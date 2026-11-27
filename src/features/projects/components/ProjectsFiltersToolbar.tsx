import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ProjectStatus } from '@/shared/api';
import { Input, Select, type SelectOption } from '@/shared/ui';
import { PROJECT_STATUSES } from '../utils/projectPresentation';

const SEARCH_DEBOUNCE_MS = 250;

const STATUS_FILTER_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'All Statuses' },
  ...PROJECT_STATUSES.map((status) => ({ value: status, label: status })),
];

const SORT_OPTIONS: readonly SelectOption[] = [{ value: 'newest', label: 'Newest' }];

export interface ProjectsFiltersToolbarProps {
  search: string;
  status: ProjectStatus | null;
  sort: 'newest';
  onSearchChange: (nextSearch: string) => void;
  onStatusChange: (nextStatus: ProjectStatus | null) => void;
}

/** Toolbar for All Projects (`1:8545`, M25): pill search, Status filter, and `Newest` sort. */
export function ProjectsFiltersToolbar({
  search,
  status,
  sort,
  onSearchChange,
  onStatusChange,
}: ProjectsFiltersToolbarProps) {
  const [draftSearch, setDraftSearch] = useState(search);
  const lastCommittedRef = useRef(search);

  useEffect(() => {
    setDraftSearch(search);
    lastCommittedRef.current = search;
  }, [search]);

  useEffect(() => {
    if (draftSearch === lastCommittedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastCommittedRef.current = draftSearch;
      onSearchChange(draftSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftSearch, onSearchChange]);

  const handleClearSearch = () => {
    setDraftSearch('');
    lastCommittedRef.current = '';
    onSearchChange('');
  };

  const handleStatusSelect = (nextValue: string) => {
    const matched = PROJECT_STATUSES.find((item) => item === nextValue) ?? null;
    onStatusChange(matched);
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="w-full md:max-w-xs">
        <Input
          label="Search projects"
          labelVariant="sr-only"
          shape="pill"
          type="search"
          placeholder="Search projects"
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
          leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          trailingAdornment={
            draftSearch.length > 0 ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={handleClearSearch}
                className="inline-flex h-7 w-7 items-center justify-center rounded-pill text-body hover:bg-surface-label hover:text-ink cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-44">
          <Select
            label="Filter by status"
            labelVariant="sr-only"
            variant="pill"
            options={STATUS_FILTER_OPTIONS}
            value={status ?? ''}
            onChange={handleStatusSelect}
            placeholder="All Statuses"
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            label="Sort projects"
            labelVariant="sr-only"
            variant="pill"
            options={SORT_OPTIONS}
            value={sort}
            onChange={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
