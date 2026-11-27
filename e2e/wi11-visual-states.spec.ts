import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  makeProjectListItem,
  makeProjectOverview,
} from '../src/features/projects/__tests__/projectsFixtures';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

async function preparePreview(page: Page, previewUrl: string) {
  const previewOrigin = new URL(previewUrl).origin;
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? '';
  if (bypassSecret) {
    await page.route(
      (url) => url.origin === previewOrigin,
      (route) =>
        route.continue({
          headers: { ...route.request().headers(), 'x-vercel-protection-bypass': bypassSecret },
        }),
    );
  }
  await page.route('https://vercel.live/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
  mkdirSync('preview-shots', { recursive: true });
}

async function captureWidths(page: Page, name: string) {
  for (const width of [1440, 1024, 768, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.screenshot({ path: `preview-shots/${name}-${width}.png`, fullPage: true });
  }
}

test('captures sign-up and recovery screens with simulated recovery responses', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const previewUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (!previewUrl) {
    test.skip(true, 'Requires a Vercel Preview deployment.');
    return;
  }
  await preparePreview(page, previewUrl);
  await page.route('https://collabspace.huma-volve.com/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/forgot-password')) {
      await route.fulfill({
        status: 200,
        json: { success: true, message: 'Check your email.', data: { expires_in_minutes: 10 } },
      });
    } else if (path.endsWith('/auth/verify-reset-otp')) {
      await route.fulfill({ status: 200, json: { success: true, message: 'Valid', data: null } });
    } else {
      await route.fulfill({ status: 404, json: { success: false, message: 'Unexpected request' } });
    }
  });

  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  await captureWidths(page, 'sign-up');
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
  await captureWidths(page, 'forgot-password');
  await page.getByLabel('Email Address').fill('preview@example.test');
  await page.getByRole('button', { name: 'Send verification code' }).click();
  await expect(page.getByRole('heading', { name: 'Verify code' })).toBeVisible();
  await captureWidths(page, 'verify-code');
  await page.getByLabel('Verification code digit 1 of 6').pressSequentially('123456');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
  await captureWidths(page, 'reset-password');
});

test('captures task details, task form and profile settings with simulated data', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const previewUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (!previewUrl) {
    test.skip(true, 'Requires a Vercel Preview deployment.');
    return;
  }
  await preparePreview(page, previewUrl);
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
    } else if (path.endsWith('/projects/1/overview')) {
      data = makeProjectOverview();
    } else if (path.endsWith('/projects/1/teams')) {
      data = [];
    } else if (path.endsWith('/tasks/1')) {
      data = task;
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
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Preview task' }).click();
  await expect(page.getByRole('dialog', { name: 'Preview task' })).toBeVisible();
  await expect(page.getByText('Task description').last()).toBeVisible();
  await captureWidths(page, 'task-details');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Create Task +' }).click();
  await expect(page.getByRole('dialog', { name: 'Create Task' })).toBeVisible();
  await expect(page.getByLabel('Task Name')).toBeVisible();
  await captureWidths(page, 'task-form');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto('/profile/settings');
  await expect(page.getByLabel('Full name')).toHaveValue('Preview User');
  await captureWidths(page, 'profile-settings');
});
