import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { makeProjectListItem } from '../src/features/projects/__tests__/projectsFixtures';

// Test fixtures and Vercel protection headers must not be included in trace artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('checks non-chart routes, keyboard navigation and accessibility on Preview', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const previewUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (!previewUrl) {
    test.skip(true, 'Requires a Vercel Preview deployment.');
    return;
  }

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

  const apiPaths: string[] = [];
  const assets: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/assets/')) assets.push(request.url());
  });
  await page.route('https://collabspace.huma-volve.com/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    apiPaths.push(path);
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
        stats: { completed_tasks: 0, total_tasks: 0, hours_worked: 0 },
        recent_activities: [],
        teams: [],
        projects: [],
      };
    } else if (path.endsWith('/projects/1/tasks/kanban')) {
      data = {
        project: { id: 1, name: 'CollabSpace Alpha', progress_percentage: 0 },
        total_tasks: 0,
        columns: {
          Pending: { name: 'Pending', count: 0, tasks: [] },
          'In Progress': { name: 'In Progress', count: 0, tasks: [] },
          'In Review': { name: 'In Review', count: 0, tasks: [] },
          Completed: { name: 'Completed', count: 0, tasks: [] },
        },
      };
    } else if (path.endsWith('/projects/1/teams')) {
      data = [];
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

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/sign-in');
  await page.evaluate(() => sessionStorage.setItem('collabspace.auth.token', 'preview-fixture'));

  for (const [path, heading] of [
    ['/projects', 'All Projects'],
    ['/tasks', 'Tasks'],
    ['/profile', 'Preview User'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    if (path === '/projects') {
      await expect(page.getByText('CollabSpace Alpha').first()).toBeVisible();
    } else if (path === '/tasks') {
      await expect(page.getByRole('heading', { name: 'To-do (0)' })).toBeVisible();
    } else {
      await expect(page.getByText('Preview profile')).toBeVisible();
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, `Accessibility violations on ${path}`).toEqual([]);
  }
  expect(assets.some((url) => url.includes('ProjectOverviewChart'))).toBe(false);
  expect(apiPaths.some((path) => path.endsWith('/dashboard'))).toBe(false);

  await page.setViewportSize({ width: 360, height: 900 });
  const drawerButton = page.getByRole('button', { name: 'Open navigation menu' });
  await drawerButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).not.toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  await page.getByRole('button', { name: /Add Project/i }).click();
  const dialog = page.getByRole('dialog', { name: 'New Project' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
