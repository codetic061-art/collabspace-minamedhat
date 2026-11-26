import { queryOptions } from '@tanstack/react-query';
import { downloadBlob, requestJson, type DownloadedFileResult } from '../httpClient';
import type { P3Block } from '../pagination';
import type { AuditLogCategory, EntityRef, TaskStatus } from '../types';

export type DashboardPeriod = 'year' | '6_months' | '3_months' | '30_days' | '7_days' | 'custom';

export interface DashboardQueryParams {
  period?: DashboardPeriod | null;
  year?: number | null;
  from?: string | null;
  to?: string | null;
}

export interface DashboardProjectChartPoint {
  label: string;
  month: string;
  month_number: number;
  year: number;
  is_future: boolean;
  projects: number;
  created_tasks: number;
  completed_tasks: number;
}

export interface DashboardActiveProjectItem {
  id: number;
  name: string;
  progress: number;
  tasks_total: number | null;
  tasks_completed: number | null;
}

export type DashboardTaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';
export type DashboardTaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface DashboardTaskItem {
  id: number;
  name: string;
  priority: DashboardTaskPriority;
  status: DashboardTaskStatus;
  status_label: TaskStatus;
  due_date: string | null;
  project: EntityRef;
  assignee: {
    id: number;
    name: string;
    avatar_url: string | null;
  } | null;
}

export interface DashboardTeamItem {
  id: number;
  name: string;
  description: string | null;
  members_count: number;
  projects_count: number;
}

export interface DashboardMeetingItem {
  id: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  meeting_link: string;
  project: EntityRef;
  creator: EntityRef;
  participants: Array<{
    id: number;
    name: string;
    avatar_url: string | null;
  }>;
}

export interface DashboardFileItem {
  id: number;
  name: string;
  mime_type: string | null;
  file_size_formatted: string;
  download_url: string;
  uploaded_by: {
    id: number;
    name: string;
  };
  project: EntityRef;
  created_at: string;
}

export interface DashboardActivityItem {
  id: number;
  category: AuditLogCategory;
  action: string;
  description: string | null;
  user: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  created_at: string;
}

/** Verified `GET /dashboard` (`#dashboard-index`, `E2` no-`message` envelope). */
export interface DashboardData {
  overview: {
    projects: {
      total: number;
      active: number;
      completed: number;
      average_progress: number;
    };
    tasks: {
      total: number;
      pending: number;
      in_progress: number;
      in_review: number;
      completed: number;
      overdue: number;
      assigned_to_me: number;
      pending_percentage: number;
      in_progress_percentage: number;
      in_review_percentage: number;
      completed_percentage: number;
      completion_rate: number;
      by_priority: {
        low: number;
        medium: number;
        high: number;
        critical: number;
      };
    };
    meetings: {
      upcoming_count: number;
    };
    teams: {
      total: number;
    };
  };
  project_overview: {
    period: string;
    year: number;
    from: string;
    to: string;
    group_by: string;
    data: DashboardProjectChartPoint[];
  };
  active_projects: P3Block<DashboardActiveProjectItem>;
  tasks: P3Block<DashboardTaskItem>;
  teams: P3Block<DashboardTeamItem>;
  upcoming_meetings: {
    items: DashboardMeetingItem[];
  };
  recent_files: P3Block<DashboardFileItem>;
  recent_activity: P3Block<DashboardActivityItem>;
}

const DASHBOARD_PATH = '/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (params: DashboardQueryParams = {}): readonly ['dashboard', DashboardQueryParams] => [
    'dashboard',
    params,
  ],
};

/** Fetches all Dashboard overview stats, chart points, and widget blocks in one call (`GET /dashboard`). */
export function getDashboard(
  params: DashboardQueryParams = {},
  signal?: AbortSignal,
): Promise<DashboardData> {
  return requestJson<DashboardData>(DASHBOARD_PATH, {
    query: {
      period: params.period,
      year: params.year,
      from: params.from,
      to: params.to,
    },
    signal,
  });
}

/** Downloads a recent dashboard file using authenticated Bearer fetch + safe URL check (`ADR-05`). */
export function downloadDashboardFile(
  file: Pick<DashboardFileItem, 'download_url' | 'name'>,
  signal?: AbortSignal,
): Promise<DownloadedFileResult> {
  return downloadBlob(file.download_url, {
    fallbackFilename: file.name,
    signal,
  });
}

export const dashboardQueries = {
  detail: (params: DashboardQueryParams = {}) =>
    queryOptions({
      queryKey: dashboardKeys.detail(params),
      queryFn: ({ signal }) => getDashboard(params, signal),
    }),
};
