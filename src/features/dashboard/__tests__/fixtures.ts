import type { DashboardData, TeamResource } from '@/shared/api';

/** Minimal but fully typed Dashboard payload used by the WI-7 tests. */
export const dashboardFixture: DashboardData = {
  overview: {
    projects: {
      total: 6,
      active: 2,
      completed: 4,
      average_progress: 32,
    },
    tasks: {
      total: 20,
      pending: 5,
      in_progress: 3,
      in_review: 0,
      completed: 12,
      overdue: 1,
      assigned_to_me: 4,
      pending_percentage: 25,
      in_progress_percentage: 15,
      in_review_percentage: 0,
      completed_percentage: 60,
      completion_rate: 60,
      by_priority: {
        low: 2,
        medium: 6,
        high: 8,
        critical: 4,
      },
    },
    meetings: { upcoming_count: 1 },
    teams: { total: 1 },
  },
  project_overview: {
    period: '6_months',
    year: 2026,
    from: '2026-06-01',
    to: '2026-11-30',
    group_by: 'month',
    data: [
      {
        label: 'Jun',
        month: 'Jun',
        month_number: 6,
        year: 2026,
        is_future: false,
        projects: 2,
        created_tasks: 4,
        completed_tasks: 1,
      },
      {
        label: 'Jul',
        month: 'Jul',
        month_number: 7,
        year: 2026,
        is_future: false,
        projects: 2,
        created_tasks: 6,
        completed_tasks: 3,
      },
      {
        label: 'Aug',
        month: 'Aug',
        month_number: 8,
        year: 2026,
        is_future: false,
        projects: 3,
        created_tasks: 5,
        completed_tasks: 2,
      },
    ],
  },
  active_projects: {
    items: [
      {
        id: 10,
        name: 'Apollo',
        progress: 38,
        tasks_total: 8,
        tasks_completed: 3,
      },
      {
        id: 11,
        name: 'Borealis',
        progress: 25,
        tasks_total: 4,
        tasks_completed: 1,
      },
    ],
    pagination: { current_page: 1, per_page: 5, total: 2 },
  },
  tasks: {
    items: [
      {
        id: 40,
        name: 'Wire dashboard',
        priority: 'high',
        status: 'in_progress',
        status_label: 'In Progress',
        due_date: '2026-12-01',
        project: { id: 10, name: 'Apollo' },
        assignee: { id: 1, name: 'Sam Lee', avatar_url: null },
      },
      {
        id: 41,
        name: 'Polish chart',
        priority: 'critical',
        status: 'pending',
        status_label: 'Pending',
        due_date: null,
        project: { id: 11, name: 'Borealis' },
        assignee: null,
      },
      {
        id: 42,
        name: 'Ship release',
        priority: 'low',
        status: 'completed',
        status_label: 'Completed',
        due_date: '2026-11-15',
        project: { id: 10, name: 'Apollo' },
        assignee: { id: 2, name: 'Ada Kim', avatar_url: null },
      },
    ],
    pagination: { current_page: 1, per_page: 5, total: 3 },
  },
  teams: {
    items: [
      {
        id: 5,
        name: 'Core Team',
        description: 'The core delivery team.',
        members_count: 3,
        projects_count: 2,
      },
    ],
    pagination: { current_page: 1, per_page: 5, total: 1 },
  },
  upcoming_meetings: {
    items: [
      {
        id: 20,
        title: 'Sprint review',
        date: '2026-12-02',
        start_time: '14:00:00',
        end_time: '15:00:00',
        meeting_link: 'https://meet.example.com/sprint-review',
        project: { id: 10, name: 'Apollo' },
        creator: { id: 1, name: 'Sam Lee' },
        participants: [
          { id: 1, name: 'Sam Lee', avatar_url: null },
          { id: 2, name: 'Ada Kim', avatar_url: null },
        ],
      },
    ],
  },
  recent_files: {
    items: [
      {
        id: 31,
        name: 'brief.pdf',
        mime_type: 'application/pdf',
        file_size_formatted: '1.2 MB',
        download_url: '/api/v1/files/31/download',
        uploaded_by: { id: 1, name: 'Sam Lee' },
        project: { id: 10, name: 'Apollo' },
        created_at: '2026-11-20T10:00:00Z',
      },
    ],
    pagination: { current_page: 1, per_page: 5, total: 1 },
  },
  recent_activity: {
    items: [],
    pagination: { current_page: 1, per_page: 5, total: 0 },
  },
};

/** Same shape with every optional list empty, for the empty-state assertions. */
export const emptyDashboardFixture: DashboardData = {
  ...dashboardFixture,
  overview: {
    ...dashboardFixture.overview,
    projects: { total: 0, active: 0, completed: 0, average_progress: 0 },
    tasks: {
      ...dashboardFixture.overview.tasks,
      total: 0,
      pending: 0,
      in_progress: 0,
      in_review: 0,
      completed: 0,
      overdue: 0,
      assigned_to_me: 0,
      pending_percentage: 0,
      in_progress_percentage: 0,
      in_review_percentage: 0,
      completed_percentage: 0,
      completion_rate: 0,
      by_priority: { low: 0, medium: 0, high: 0, critical: 0 },
    },
    meetings: { upcoming_count: 0 },
    teams: { total: 0 },
  },
  project_overview: {
    ...dashboardFixture.project_overview,
    data: [],
  },
  active_projects: {
    items: [],
    pagination: { current_page: 1, per_page: 5, total: 0 },
  },
  tasks: {
    items: [],
    pagination: { current_page: 1, per_page: 5, total: 0 },
  },
  teams: {
    items: [],
    pagination: { current_page: 1, per_page: 5, total: 0 },
  },
  upcoming_meetings: { items: [] },
  recent_files: {
    items: [],
    pagination: { current_page: 1, per_page: 5, total: 0 },
  },
  recent_activity: {
    items: [],
    pagination: { current_page: 1, per_page: 5, total: 0 },
  },
};

/** Response for the team-detail request triggered by selecting a team. */
export const teamDetailFixture: TeamResource = {
  id: 5,
  name: 'Core Team',
  description: 'The core delivery team.',
  created_by: 1,
  creator: { id: 1, name: 'Sam Lee', email: 'sam.lee@example.com' },
  members_count: 1,
  active_projects_count: 2,
  members: [
    {
      id: 1,
      name: 'Sam Lee',
      email: 'sam.lee@example.com',
      job_title: 'Engineer',
      avatar_url: null,
      role_in_team: 'Team Lead',
      is_leader: true,
      joined_at: '2026-01-01T00:00:00Z',
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
