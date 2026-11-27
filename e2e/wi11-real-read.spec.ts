import { expect, test } from '@playwright/test';

// Authentication and private application data must not be saved in artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.describe.configure({ mode: 'serial', retries: 0 });

for (const role of ['ADMIN', 'PM'] as const) {
  test(`real read-only Preview flow: ${role}`, async ({ page }) => {
    const previewUrl = process.env.PLAYWRIGHT_BASE_URL;
    const email = process.env[`WI11_${role}_EMAIL`];
    const password = process.env[`WI11_${role}_PASSWORD`];
    if (!previewUrl || !email || !password) {
      test.skip(true, 'Requires Preview URL and role credentials in the cloud secret store.');
      return;
    }

    const previewOrigin = new URL(previewUrl).origin;
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

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    // Avoid locator.fill call logs, which can include the literal entered value on failure.
    await page.evaluate(
      ({ emailValue, passwordValue }) => {
        // The two fixed pairs must retain their input/value tuple types.
        const inputs = [
          [document.querySelector<HTMLInputElement>('input[type="email"]'), emailValue],
          [document.querySelector<HTMLInputElement>('input[type="password"]'), passwordValue],
        ] as const;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (!setter || inputs.some(([input]) => !input)) throw new Error('Sign-in inputs missing');
        for (const [input, value] of inputs) {
          if (!input) throw new Error('Sign-in input missing');
          setter.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      { emailValue: email, passwordValue: password },
    );
    const loginResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith('/auth/login') &&
        response.request().method() === 'POST',
    );
    const dashboardResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith('/dashboard'),
    );
    await page.getByRole('button', { name: 'Sign in' }).click();
    expect((await loginResponse).status()).toBe(200);
    expect((await dashboardResponse).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Pending Tasks' })).toBeVisible();

    const token = await page.evaluate(() => sessionStorage.getItem('collabspace.auth.token'));
    expect(Boolean(token)).toBe(true);
    const restoredMe = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith('/auth/me'),
    );
    await page.reload();
    expect((await restoredMe).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Pending Tasks' })).toBeVisible();

    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'All Projects' })).toBeVisible();
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
    await page.goto('/profile');
    await expect(page.getByRole('tablist', { name: 'Profile sections' })).toBeVisible();

    const logoutResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith('/auth/logout') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'User menu' }).click();
    await expect(page.getByText(role === 'ADMIN' ? 'Administrator' : 'Project Manager').first()).toBeVisible();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    expect((await logoutResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-in/);
    expect(await page.evaluate(() => sessionStorage.getItem('collabspace.auth.token'))).toBeNull();

    // Only the status is returned to the test runner; the bearer token stays in memory.
    const revokedStatus = await page.evaluate(async (oldToken) => {
      const response = await fetch('https://collabspace.huma-volve.com/api/v1/auth/me', {
        headers: { Accept: 'application/json', Authorization: `Bearer ${oldToken}` },
      });
      return response.status;
    }, token);
    expect(revokedStatus).toBe(401);
  });
}
