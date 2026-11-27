import { useQuery } from '@tanstack/react-query';
import { dashboardQueries } from '@/shared/api';

/**
 * The single Dashboard data source (`GET /dashboard`, ID-5, ID-18). Every card receives
 * this one query result, so the initial page load issues exactly one dashboard request.
 */
export function useDashboard() {
  return useQuery(dashboardQueries.detail());
}

export type DashboardQueryResult = ReturnType<typeof useDashboard>;
