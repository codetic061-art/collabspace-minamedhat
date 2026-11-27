import type {
  ProjectListItem,
  ProjectOverviewWithChart,
  ProjectTeamProgress,
  TeamResource,
  UserResource,
} from '@/shared/api';

export function makeProjectListItem(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    id: 1,
    name: 'CollabSpace Alpha',
    description: 'Core workspace launch',
    start_date: '2026-10-12',
    deadline: '2026-12-25',
    status: 'In Progress',
    priority: 'High',
    progress_percentage: 42,
    files_count: 14,
    teams: [
      { id: 1, name: 'UI/UX' },
      { id: 2, name: 'Frontend' },
    ],
    created_at: '2026-10-12T09:00:00+00:00',
    ...overrides,
  };
}

export function makeProjectOverview(
  overrides: Partial<ProjectOverviewWithChart> = {},
): ProjectOverviewWithChart {
  return {
    id: 1,
    name: 'CollabSpace Alpha',
    description: 'Primary team collaboration release.',
    status: 'In Progress',
    priority: 'High',
    progress_percentage: 78,
    due_date_indicator: {
      start_date: '2026-10-12',
      deadline: '2026-12-25',
      total_days: 74,
      days_remaining: 28,
      is_overdue: false,
    },
    tasks_statistics: {
      total: 100,
      pending: 20,
      in_progress: 30,
      in_review: 10,
      completed: 40,
      completion_rate: 40,
      pending_percentage: 20,
      in_progress_percentage: 30,
      in_review_percentage: 10,
      completed_percentage: 40,
    },
    counts: {
      files: 14,
      meetings: 3,
      messages: 12,
      teams: 2,
      direct_members: 1,
    },
    teams: [
      {
        id: 10,
        name: 'Frontend',
        description: 'Frontend engineers',
        created_by: 7,
        members_count: 2,
        active_projects_count: 3,
        created_at: '2026-09-01T10:00:00+00:00',
        updated_at: '2026-09-01T10:00:00+00:00',
      },
    ],
    direct_members: [
      {
        id: 50,
        name: 'Dana Farouk',
        email: 'dana@example.test',
        avatar_url: null,
        job_title: 'Product Stakeholder',
        role: 'Stakeholder',
      },
    ],
    created_by: 7,
    creator: {
      id: 7,
      name: 'Alex Morgan',
      email: 'alex@example.test',
    },
    created_at: '2026-10-12T09:00:00+00:00',
    updated_at: '2026-11-20T09:00:00+00:00',
    chart: {
      period: 'year',
      year: 2026,
      group_by: 'month',
      data: [
        {
          month: 'Jan',
          month_number: 1,
          year: 2026,
          label: 'Jan 2026',
          created_tasks: 12,
          completed_tasks: 8,
          progress_percentage: 67,
          is_future: false,
        },
        {
          month: 'Feb',
          month_number: 2,
          year: 2026,
          label: 'Feb 2026',
          created_tasks: 18,
          completed_tasks: 15,
          progress_percentage: 83,
          is_future: false,
        },
      ],
    },
    ...overrides,
  };
}

export function makeProjectTeamsProgress(): ProjectTeamProgress[] {
  return [
    {
      id: 10,
      name: 'Frontend',
      completion_percentage: 60,
      total_tasks: 10,
      completed_tasks: 6,
      members: [
        {
          id: 101,
          name: 'Salma Nabil',
          avatar_url: null,
          role_in_team: 'Team Lead',
          is_leader: true,
          tasks_completed: 4,
          tasks_total: 5,
          tasks_ratio: '4/5',
          progress_percentage: 80,
        },
        {
          id: 102,
          name: 'Karim Zaki',
          avatar_url: null,
          role_in_team: 'Frontend Developer',
          is_leader: false,
          tasks_completed: 2,
          tasks_total: 5,
          tasks_ratio: '2/5',
          progress_percentage: 40,
        },
      ],
    },
    {
      id: 11,
      name: 'Design',
      completion_percentage: 80,
      total_tasks: 5,
      completed_tasks: 4,
      members: [
        {
          id: 103,
          name: 'Laila Mansour',
          avatar_url: null,
          role_in_team: 'UI/UX Designer',
          is_leader: false,
          tasks_completed: 4,
          tasks_total: 5,
          tasks_ratio: '4/5',
          progress_percentage: 80,
        },
      ],
    },
  ];
}

export function makeUserResource(overrides: Partial<UserResource> = {}): UserResource {
  return {
    id: 1,
    name: 'User One',
    email: 'user1@example.test',
    job_title: 'Developer',
    about: null,
    years_of_experience: 3,
    phone: null,
    avatar_url: null,
    status: 'active',
    available_status: 'available',
    current_project_id: null,
    roles: ['Team Member'],
    permissions: [],
    google_linked: false,
    facebook_linked: false,
    linkedin_linked: false,
    created_at: '2026-10-01T10:00:00+00:00',
    updated_at: '2026-10-01T10:00:00+00:00',
    ...overrides,
  };
}

export function makeTeamResource(overrides: Partial<TeamResource> = {}): TeamResource {
  return {
    id: 10,
    name: 'Frontend',
    description: 'Frontend engineers',
    created_by: 7,
    creator: { id: 7, name: 'Alex Morgan', email: 'alex@example.test' },
    members_count: 2,
    active_projects_count: 1,
    members: [],
    created_at: '2026-10-01T10:00:00+00:00',
    updated_at: '2026-10-01T10:00:00+00:00',
    ...overrides,
  };
}
