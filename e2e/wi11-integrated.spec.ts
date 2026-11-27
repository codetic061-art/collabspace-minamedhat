import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { makeProjectListItem } from '../src/features/projects/__tests__/projectsFixtures';

// Bypass headers and fixture sessions must never appear in trace artifacts.
test.use({ trace: 'off' });

const task = {
  id: 1,
  name: 'Preview task',
  description: 'Task description',
  priority: 'High',
  status: 'Pending',
  due_date: null,
  completed_at: null,
  hours_spent: 0,
  project_id: 1,
  team_id: null,
  assigned_to: null,
  created_by: 9,
  project: { id: 1, name: 'CollabSpace Alpha' },
  team: null,
  assignee: null,
  creator: { id: 9, name: 'Preview User', email: 'preview@example.test' },
  attachments_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

test('renders Tasks and Profile on Preview at supported widths with a simulated API', async ({
  page,
}) => {
  const previewBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (!previewBaseUrl) {
    test.skip(true, 'Requires a Vercel Preview deployment.');
    return;
  }

  const previewOrigin = new URL(previewBaseUrl).origin;
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? '';
  if (bypassSecret) {
    await page.route(
      (url) => url.origin === previewOrigin,
      async (route) => {
        await route.continue({
          headers: { ...route.request().headers(), 'x-vercel-protection-bypass': bypassSecret },
        });
      },
    );
  }

  await page.route('https://collabspace.huma-volve.com/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith('/auth/me')) {
      data = {
        user: {
          id: 9,
          name: 'Preview User',
          email: 'preview@example.test',
          job_title: 'Project Manager',
          roles: ['Project Manager'],
          permissions: [],
          avatar_url: null,
          about: 'Preview profile',
        },
        stats: { completed_tasks: 3, total_tasks: 4, hours_worked: 8 },
        recent_activities: [],
        teams: [],
        projects: [],
      };
    } else if (path.endsWith('/projects/1/tasks/kanban')) {
      data = {
        project: { id: 1, name: 'CollabSpace Alpha', progress_percentage: 0 },
        total_tasks: 1,
        columns: {
          Pending: { name: 'Pending', count: 1, tasks: [task] },
          'In Progress': { name: 'In Progress', count: 0, tasks: [] },
          'In Review': { name: 'In Review', count: 0, tasks: [] },
          Completed: { name: 'Completed', count: 0, tasks: [] },
        },
      };
    } else if (path.endsWith('/projects/1/teams')) {
      data = [];
    } else if (path.endsWith('/tasks/1')) {
      data = task;
    } else if (path.endsWith('/auth/profile/tasks')) {
      data = { current_page: 1, last_page: 1, per_page: 15, total: 1, data: [task] };
    } else if (path.endsWith('/projects')) {
      data = {
        data: [makeProjectListItem()],
        links: { first: null, last: null, prev: null, next: null },
        meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      };
    } else {
      await route.fulfill({ status: 404, json: { success: false, message: 'Unexpected request' } });
      return;
    }
    await route.fulfill({ status: 200, json: { success: true, data } });
  });

  await page.goto('/sign-in');
  await page.evaluate(() => sessionStorage.setItem('collabspace.auth.token', 'preview-fixture'));
  mkdirSync('preview-shots', { recursive: true });
  for (const width of [1440, 1024, 768, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview task' })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.screenshot({ path: `preview-shots/tasks-${width}.png`, fullPage: true });
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Preview User' })).toBeVisible();
    await expect(page.getByText('Preview profile')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.screenshot({ path: `preview-shots/profile-${width}.png`, fullPage: true });
  }
  await page.getByRole('tab', { name: 'tasks' }).click();
  await expect(page.getByText('Preview task')).toBeVisible();
  await page.getByRole('link', { name: 'Edit profile' }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Preview User');
});
