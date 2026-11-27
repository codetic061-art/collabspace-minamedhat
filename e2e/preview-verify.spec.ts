import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

interface CspViolationEntry {
  violatedDirective: string;
  blockedURI: string;
  sourceFile: string;
}

declare global {
  interface Window {
    __cspViolations?: CspViolationEntry[];
  }
}

// Disable trace recording here so protection bypass headers are never written to trace artifacts.
test.use({ trace: 'off' });

// ADR-0012 intentionally keeps `upgrade-insecure-requests` in Content-Security-Policy-Report-Only on Preview
// until Gate 2 promotes the header to enforcing CSP; Chromium logs this exact diagnostic twice during load.
const REPORT_ONLY_UPGRADE_NOTICE =
  "The Content Security Policy directive 'upgrade-insecure-requests' is ignored when delivered in a report-only policy.";

test('verifies Vercel Preview headers, SPA fallback, API config, CSP, and a11y', async ({
  page,
  request,
}) => {
  const previewBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (!previewBaseUrl) {
    test.skip(true, 'Requires PLAYWRIGHT_BASE_URL pointing to a Vercel Preview deployment.');
    return;
  }

  const previewOrigin = new URL(previewBaseUrl).origin;
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ?? '';
  const previewBypassHeaders: Record<string, string> = bypassSecret
    ? { 'x-vercel-protection-bypass': bypassSecret }
    : {};

  if (bypassSecret) {
    // Confirm Vercel Deployment Protection stays enforced for unauthenticated requests.
    const unauthenticatedResponse = await request.get('/', { maxRedirects: 0 });
    expect([302, 307, 401, 403]).toContain(unauthenticatedResponse.status());
  }

  const rootResponse = await request.get('/', { headers: previewBypassHeaders });
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

  const recoveryResponse = await request.get('/forgot-password', { headers: previewBypassHeaders });
  expect(recoveryResponse.status()).toBe(200);
  const recoveryHeaders = recoveryResponse.headers();
  expect(recoveryHeaders['content-type'] ?? '').toContain('text/html');
  expect(recoveryHeaders['referrer-policy']).toBe('no-referrer');

  // ADR-12: missing hashed chunks under /assets/ must return 404 rather than HTML SPA fallback.
  const missingAssetResponse = await request.get('/assets/does-not-exist.js', {
    headers: previewBypassHeaders,
  });
  expect(missingAssetResponse.status()).toBe(404);
  expect(missingAssetResponse.headers()['content-type'] ?? '').not.toContain('text/html');

  if (bypassSecret) {
    // Scope the bypass header strictly to the Vercel Preview origin so it never reaches third-party APIs.
    await page.route(
      (url) => url.origin === previewOrigin,
      async (route) => {
        await route.continue({
          headers: {
            ...route.request().headers(),
            'x-vercel-protection-bypass': bypassSecret,
          },
        });
      },
    );
  }

  // Silence Vercel Preview edge-injected Toolbar script so third-party feedback widgets do not run eval/iframes
  // or inject toolbar DOM into automated CSP and accessibility assertions.
  await page.route(
    (url) => url.origin === 'https://vercel.live',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '',
      });
    },
  );

  await page.addInitScript(() => {
    const violations: CspViolationEntry[] = [];
    window.__cspViolations = violations;
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push({
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
      });
    });
  });

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const assetErrors: string[] = [];
  const bundleBodies: string[] = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && text !== REPORT_ONLY_UPGRADE_NOTICE) {
      consoleErrors.push(text);
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (url.startsWith(previewOrigin) && response.status() >= 400) {
      assetErrors.push(`${response.status()} ${new URL(url).pathname}`);
    }
    if (url.includes('/assets/') && url.endsWith('.js')) {
      try {
        bundleBodies.push(await response.text());
      } catch {
        // Ignore aborted or unreadable asset streams during teardown.
      }
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  const gotoResponse = await page.goto('/', { waitUntil: 'networkidle' });
  expect(gotoResponse?.status()).toBe(200);
  expect(assetErrors, 'Failed same-origin asset responses').toEqual([]);
  expect(pageErrors, 'Uncaught page errors on Preview').toEqual([]);
  expect(consoleErrors, 'Console errors on Preview').toEqual([]);

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('CollabSpace', { exact: true })).toBeVisible();
  expect(
    bundleBodies.some((body) => body.includes('https://collabspace.huma-volve.com/api/v1')),
  ).toBe(true);

  const cspViolations = (await page.evaluate(() => window.__cspViolations ?? [])).filter(
    (entry) =>
      !entry.blockedURI.startsWith('https://vercel.live') &&
      !entry.sourceFile.startsWith('https://vercel.live'),
  );
  expect(cspViolations).toEqual([]);

  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axeResults.violations).toEqual([]);

  mkdirSync('preview-shots', { recursive: true });
  await page.screenshot({ path: 'preview-shots/wi3-1440.png', fullPage: true });
});
