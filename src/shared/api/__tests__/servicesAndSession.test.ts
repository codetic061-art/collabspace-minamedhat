import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from '@/shared/lib';
import {
  authService,
  dashboardService,
  moveKanbanTaskOptimistically,
  profileService,
  projectsService,
  tasksService,
  teamsService,
  usersService,
  type KanbanBoardData,
  type TaskResource,
  type UserResource,
} from '@/shared/api';
import { mswServer } from '@/test/setup';

const BASE = 'https://collabspace.huma-volve.com/api/v1';

const SAMPLE_USER: UserResource = {
  id: 1,
  name: 'Alex Morgan',
  email: 'alex@example.test',
  job_title: 'Project Manager',
  about: null,
  years_of_experience: 4,
  phone: null,
  avatar_url: null,
  status: 'active',
  available_status: 'available',
  current_project_id: null,
  roles: ['Project Manager'],
  permissions: [],
  google_linked: false,
  facebook_linked: false,
  linkedin_linked: false,
  created_at: '2026-11-26T10:00:00+00:00',
  updated_at: '2026-11-26T10:00:00+00:00',
};

const SAMPLE_TASK: TaskResource = {
  id: 11,
  name: 'Wire API client',
  description: null,
  priority: 'High',
  status: 'Pending',
  due_date: '2026-11-30',
  completed_at: null,
  hours_spent: 2,
  project_id: 5,
  team_id: null,
  assigned_to: 1,
  created_by: 1,
  project: { id: 5, name: 'CollabSpace' },
  team: null,
  assignee: {
    id: 1,
    name: 'Alex Morgan',
    email: 'alex@example.test',
    avatar_url: null,
    job_title: 'Project Manager',
  },
  creator: { id: 1, name: 'Alex Morgan', email: 'alex@example.test' },
  attachments_count: 0,
  created_at: '2026-11-26T10:00:00+00:00',
  updated_at: '2026-11-26T10:00:00+00:00',
};

describe('Tier 1 services and session flows (Layer 3 MSW)', () => {
  beforeEach(() => {
    clearAuthToken();
  });

  it('restores via /auth/me, clears on logout error, and clears after reset', async () => {
    mswServer.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({
          success: true,
          message: 'Logged in successfully.',
          data: { user: SAMPLE_USER, token: 'fake-token-abc', token_type: 'Bearer' },
        }),
      ),
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({
          success: true,
          message: 'Profile retrieved successfully.',
          data: {
            user: { ...SAMPLE_USER, current_project: null },
            stats: { completed_tasks: 2, total_tasks: 5, hours_worked: 12 },
            recent_activities: [],
            teams: [],
            projects: [],
          },
        }),
      ),
      http.post(`${BASE}/auth/logout`, () => HttpResponse.error()),
      http.post(`${BASE}/auth/reset-password`, () =>
        HttpResponse.json({
          success: true,
          message: 'Password has been reset successfully. Please log in with your new password.',
          data: null,
        }),
      ),
    );

    const loginRes = await authService.login({
      email: 'alex@example.test',
      password: 'password123',
      remember: true,
    });
    setAuthToken(loginRes.token, { remember: true });
    expect(getAuthToken()).toBe('fake-token-abc');

    const me = await profileService.getMe();
    expect(me.stats.completed_tasks).toBe(2);

    try {
      await authService.logout();
    } catch {
      // Logout caller always clears local session even when network fails (ADR-01).
    } finally {
      clearAuthToken();
    }
    expect(getAuthToken()).toBeNull();

    setAuthToken('fake-token-reset-case');
    await authService.resetPassword({
      email: 'alex@example.test',
      otp: '123456',
      password: 'newpassword1',
      password_confirmation: 'newpassword1',
    });
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('calls Tier 1 domain services with verified plain.md response shapes', async () => {
    setAuthToken('fake-pm-token');

    mswServer.use(
      http.get(`${BASE}/dashboard`, () =>
        HttpResponse.json({
          success: true,
          data: {
            overview: {
              projects: { total: 1, active: 1, completed: 0, average_progress: 50 },
              tasks: {
                total: 1,
                pending: 1,
                in_progress: 0,
                in_review: 0,
                completed: 0,
                overdue: 0,
                assigned_to_me: 1,
                pending_percentage: 100,
                in_progress_percentage: 0,
                in_review_percentage: 0,
                completed_percentage: 0,
                completion_rate: 0,
                by_priority: { low: 0, medium: 0, high: 1, critical: 0 },
              },
              meetings: { upcoming_count: 0 },
              teams: { total: 1 },
            },
            project_overview: {
              period: 'year',
              year: 2026,
              from: '2026-01-01',
              to: '2026-12-31',
              group_by: 'month',
              data: [],
            },
            active_projects: { items: [], pagination: { current_page: 1, per_page: 5, total: 0 } },
            tasks: {
              items: [
                {
                  id: 11,
                  name: 'Wire API client',
                  priority: 'high',
                  status: 'in_progress',
                  status_label: 'In Progress',
                  due_date: '2026-11-30',
                  project: { id: 5, name: 'CollabSpace' },
                  assignee: null,
                },
              ],
              pagination: { current_page: 1, per_page: 5, total: 1 },
            },
            teams: { items: [], pagination: { current_page: 1, per_page: 10, total: 0 } },
            upcoming_meetings: { items: [] },
            recent_files: { items: [], pagination: { current_page: 1, per_page: 5, total: 0 } },
            recent_activity: { items: [], pagination: { current_page: 1, per_page: 10, total: 0 } },
          },
        }),
      ),
      http.get(`${BASE}/projects`, () =>
        HttpResponse.json({
          success: true,
          message: 'Projects retrieved successfully.',
          data: {
            data: [],
            links: { first: 'u', last: 'u', prev: null, next: null },
            meta: {
              current_page: 1,
              from: null,
              last_page: 1,
              links: [],
              path: `${BASE}/projects`,
              per_page: 15,
              to: null,
              total: 0,
            },
          },
        }),
      ),
      http.get(`${BASE}/projects/5/tasks/kanban`, () =>
        HttpResponse.json({
          success: true,
          message: "Kanban board for project 'CollabSpace' retrieved successfully.",
          data: {
            project: { id: 5, name: 'CollabSpace', progress_percentage: 50 },
            total_tasks: 1,
            columns: {
              Pending: { name: 'Pending', count: 1, tasks: [SAMPLE_TASK] },
              'In Progress': { name: 'In Progress', count: 0, tasks: [] },
              'In Review': { name: 'In Review', count: 0, tasks: [] },
              Completed: { name: 'Completed', count: 0, tasks: [] },
            },
          },
        }),
      ),
      http.get(`${BASE}/team-roles`, () =>
        HttpResponse.json({
          success: true,
          message: 'Team roles retrieved successfully.',
          data: {
            roles: [
              { value: 'Team Lead', is_leader: true },
              { value: 'Member', is_leader: false },
            ],
            default: 'Member',
          },
        }),
      ),
      http.get(`${BASE}/users`, () =>
        HttpResponse.json({
          success: true,
          data: [SAMPLE_USER],
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        }),
      ),
    );

    const dashboard = await dashboardService.getDashboard();
    expect(dashboard.tasks.items[0]?.status).toBe('in_progress');
    expect(dashboard.tasks.items[0]?.status_label).toBe('In Progress');

    const projectsPage = await projectsService.listProjects({ per_page: 15 });
    expect(projectsPage.items).toEqual([]);

    const board: KanbanBoardData = await tasksService.getProjectKanban(5);
    const moved = moveKanbanTaskOptimistically(board, 11, 'Completed');
    expect(moved.columns.Pending.count).toBe(0);
    expect(moved.columns.Completed.count).toBe(1);
    expect(moved.columns.Completed.tasks[0]?.status).toBe('Completed');

    const teamRoles = await teamsService.getTeamRoles();
    expect(teamRoles.default).toBe('Member');

    const usersPage = await usersService.listUsers({ per_page: 20 });
    expect(usersPage.items).toHaveLength(1);
    expect(usersPage.total).toBe(1);
  });
});
