import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders the root scaffold cleanly with zero console or WCAG AA errors', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto('/');

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('CollabSpace', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Email Address/i)).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Google/i })).toHaveCount(0);

  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(axeResults.violations).toEqual([]);

  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  const referrerPolicy = await page.locator('meta[name="referrer"]').getAttribute('content');
  expect(referrerPolicy).toBe('no-referrer');

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
