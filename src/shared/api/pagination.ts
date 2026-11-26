export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  unreadCount?: number;
}

export interface PaginationLinkItem {
  url: string | null;
  label: string;
  page?: number | null;
  active: boolean;
}

/** P1: Laravel API-resource collection nested inside `data` (`#projects-index`, `#tasks-index`, `#teams-index`). */
export interface P1Collection<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    links: PaginationLinkItem[];
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

/** P2: Raw Laravel `LengthAwarePaginator` inside `data` (`#profile-tasks`). */
export interface P2Paginator<T> {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: PaginationLinkItem[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

/** P3: Dashboard widget block pagination (`#dashboard-index`). */
export interface P3PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
}

export interface P3Block<T> {
  items: T[];
  pagination: P3PaginationMeta;
}

/** P4: Sibling `meta` next to `data` with no `links` (`#users-index`, `#notifications-index`, `#audit-logs-index`). */
export interface P4Meta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  unread_count?: number;
}

export interface P4Payload<T> {
  data: T[];
  meta: P4Meta;
}

/** Normalizes P1 nested Laravel API-resource collections. */
export function normalizeP1<T>(payload: P1Collection<T>): PaginatedResult<T> {
  return {
    items: payload.data,
    currentPage: payload.meta.current_page,
    lastPage: payload.meta.last_page,
    perPage: payload.meta.per_page,
    total: payload.meta.total,
  };
}

/** Normalizes P2 raw Laravel `LengthAwarePaginator` responses. */
export function normalizeP2<T>(payload: P2Paginator<T>): PaginatedResult<T> {
  return {
    items: payload.data,
    currentPage: payload.current_page,
    lastPage: payload.last_page,
    perPage: payload.per_page,
    total: payload.total,
  };
}

/** Normalizes P3 dashboard widget blocks, deriving `lastPage` cleanly from `total` and `per_page`. */
export function normalizeP3<T>(payload: P3Block<T>): PaginatedResult<T> {
  const perPage = Math.max(1, payload.pagination.per_page);
  const lastPage = Math.max(1, Math.ceil(payload.pagination.total / perPage));
  return {
    items: payload.items,
    currentPage: payload.pagination.current_page,
    lastPage,
    perPage: payload.pagination.per_page,
    total: payload.pagination.total,
  };
}

/** Normalizes P4 top-level `{ data, meta }` responses (preserving `meta.unread_count` when present). */
export function normalizeP4<T>(payload: P4Payload<T>): PaginatedResult<T> {
  const result: PaginatedResult<T> = {
    items: payload.data,
    currentPage: payload.meta.current_page,
    lastPage: payload.meta.last_page,
    perPage: payload.meta.per_page,
    total: payload.meta.total,
  };

  if (typeof payload.meta.unread_count === 'number') {
    result.unreadCount = payload.meta.unread_count;
  }

  return result;
}
