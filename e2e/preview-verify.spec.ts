import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

interface CspViolationEntry {
  violatedDirective: string;
  blockedURI: string;
}

declare global {
  interface Window {
    __cspViolations?: CspViolationEntry[];
  }
}

test('verifies Vercel Preview headers, SPA fallback, API config, CSP, and a11y', async ({
  page,
  request,
}) => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    'Requires PLAYWRIGHT_BASE_URL pointing to a Vercel Preview deployment.',
  );

  const rootResponse = await request.get('/');
  expect(rootResponse.status()).toBe(200);

  const rootHeaders = rootResponse.headers();
  expect(
    rootHeaders['x-matched-path'],
    'Vercel Preview Deployment Protection (SSO /login) is blocking unauthenticated preview requests.',
  ).not.toBe('/login');
  expect(rootHeaders['x-content-type-options']).toBe('nosniff');
  expect(rootHeaders['x-frame-options']).toBe('DENY');
  expect(rootHeaders['referrer-policy']).toBeTruthy();
  expect(rootHeaders['permissions-policy']).toBeTruthy();
  expect(rootHeaders['cross-origin-opener-policy']).toBe('same-origin');

  const cspReportOnly = rootHeaders['content-security-policy-report-only'] ?? '';
  expect(cspReportOnly).toContain("script-src 'self'");
  expect(cspReportOnly).toContain("connect-src 'self' https://collabspace.huma-volve.com");

  const recoveryResponse = await request.get('/forgot-password');
  expect(recoveryResponse.status()).toBe(200);
  const recoveryHeaders = recoveryResponse.headers();
  expect(recoveryHeaders['content-type'] ?? '').toContain('text/html');
  expect(recoveryHeaders['referrer-policy']).toBe('no-referrer');

  await page.addInitScript(() => {
    const violations: CspViolationEntry[] = [];
    window.__cspViolations = violations;
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push({
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
      });
    });
  });

  const bundleBodies: string[] = [];
  page.on('response', async (response) => {
    if (response.url().includes('/assets/') && response.url().endsWith('.js')) {
      try {
        bundleBodies.push(await response.text());
      } catch {
        // Ignore aborted or unreadable asset streams during teardown.
      }
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByText('https://collabspace.huma-volve.com/api/v1')).toBeVisible();
  expect(
    bundleBodies.some((body) => body.includes('https://collabspace.huma-volve.com/api/v1')),
  ).toBe(true);

  const cspViolations = await page.evaluate(() => window.__cspViolations ?? []);
  expect(cspViolations).toEqual([]);

  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axeResults.violations).toEqual([]);

  mkdirSync('preview-shots', { recursive: true });
  await page.screenshot({ path: 'preview-shots/wi3-1440.png', fullPage: true });
});
