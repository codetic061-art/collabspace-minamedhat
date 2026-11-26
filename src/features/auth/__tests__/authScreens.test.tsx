import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/providers';
import { createAppRoutes } from '@/app/router';
import type { UserResource } from '@/shared/api';
import { clearAuthToken, registerUnauthorizedHandler, resetUnauthorizedGuard } from '@/shared/lib';
import { expectNoA11yViolations } from '@/test/a11y';
import { createTestQueryClient } from '@/test/render';
import { mswServer } from '@/test/setup';
import { render } from '@testing-library/react';

const BASE = 'https://collabspace.huma-volve.com/api/v1';

const PM_USER: UserResource = {
  id: 7,
  name: 'Alex Morgan',
  email: 'alex@example.test',
  job_title: 'Project Manager',
  about: null,
  years_of_experience: 5,
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

function renderAtRoute(initialPath: string) {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(createAppRoutes(), {
    initialEntries: [initialPath],
  });

  return {
    router,
    ...render(
      <AppProviders queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}

describe('Auth screens (Layer 2 + Layer 5)', () => {
  beforeEach(() => {
    clearAuthToken();
    resetUnauthorizedGuard();
    registerUnauthorizedHandler(null);
  });

  it('renders Sign in without excluded UI and handles 401/422/429 + double submit', async () => {
    const user = userEvent.setup();
    let resolveSlowLogin: (() => void) | null = null;
    let loginCallCount = 0;

    mswServer.use(
      http.post(`${BASE}/auth/login`, async () => {
        loginCallCount += 1;
        if (loginCallCount === 1) {
          return HttpResponse.json(
            { success: false, message: 'Invalid email or password.', errors: null },
            { status: 401 },
          );
        }
        if (loginCallCount === 2) {
          return HttpResponse.json(
            {
              success: false,
              message: 'Validation failed.',
              errors: { email: ['These credentials do not match our records.'] },
            },
            { status: 422 },
          );
        }
        if (loginCallCount === 3) {
          return HttpResponse.json(
            { success: false, message: 'Too Many Attempts.', errors: null },
            { status: 429, headers: { 'Retry-After': '12' } },
          );
        }
        await new Promise<void>((resolve) => {
          resolveSlowLogin = resolve;
        });
        return HttpResponse.json({
          success: true,
          message: 'Logged in successfully.',
          data: { user: PM_USER, token: 'fake-login-token', token_type: 'Bearer' },
        });
      }),
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({
          success: true,
          message: 'Profile retrieved successfully.',
          data: {
            user: { ...PM_USER, current_project: null },
            stats: { completed_tasks: 0, total_tasks: 0, hours_worked: 0 },
            recent_activities: [],
            teams: [],
            projects: [],
          },
        }),
      ),
    );

    const { container } = renderAtRoute('/sign-in');

    const heading = await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(heading).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Google/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/language/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/verify you are human/i)).not.toBeInTheDocument();

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText('Password');
    await user.type(emailInput, 'alex@example.test');
    await user.type(passwordInput, 'wrongpass1');

    // 1) 401 keeps user on Sign in with preserved values.
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(emailInput).toHaveValue('alex@example.test');
    expect(passwordInput).toHaveValue('wrongpass1');

    // 2) 422 maps field error and focuses invalid field.
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('These credentials do not match our records.')).toBeVisible();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveFocus();

    // 3) 429 with Retry-After renders countdown and disables submit.
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Try again in 12s.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();

    // Verify password visibility toggle works accessibly.
    const toggleBtn = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await expectNoA11yViolations(container);

    // 4) Duplicate-submit guard sends only one in-flight request.
    const slowRender = renderAtRoute('/sign-in');
    const [secondEmail] = slowRender.getAllByLabelText(/Email Address/i);
    const [secondPass] = slowRender.getAllByLabelText('Password');
    await user.type(secondEmail!, 'alex@example.test');
    await user.type(secondPass!, 'password123');
    const [, secondBtn] = slowRender.getAllByRole('button', { name: 'Sign in' });
    await user.dblClick(secondBtn!);

    await waitFor(() => expect(loginCallCount).toBe(4));
    expect(slowRender.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    resolveSlowLogin?.();
    await slowRender.findByRole('heading', { level: 1, name: 'Dashboard' });
  });

  it('sends strictly the 4 OpenAPI fields on Sign up and maps taken-email 422', async () => {
    const user = userEvent.setup();
    let capturedBody: Record<string, unknown> | null = null;
    let attempt = 0;

    mswServer.use(
      http.post(`${BASE}/auth/register`, async ({ request }) => {
        attempt += 1;
        // Test captures parsed JSON body to verify only the 4 OpenAPI fields are sent.
        capturedBody = (await request.json()) as Record<string, unknown>;
        if (attempt === 1) {
          return HttpResponse.json(
            {
              success: false,
              message: 'The email has already been taken.',
              errors: { email: ['The email has already been taken.'] },
            },
            { status: 422 },
          );
        }
        return HttpResponse.json(
          {
            success: true,
            message: 'Registered.',
            data: { user: PM_USER, token: 'fake-reg-token', token_type: 'Bearer' },
          },
          { status: 201 },
        );
      }),
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({
          success: true,
          message: 'Profile retrieved successfully.',
          data: {
            user: { ...PM_USER, roles: ['Team Member'], current_project: null },
            stats: { completed_tasks: 0, total_tasks: 0, hours_worked: 0 },
            recent_activities: [],
            teams: [],
            projects: [],
          },
        }),
      ),
    );

    const { container } = renderAtRoute('/sign-up');

    await user.type(await screen.findByLabelText(/Full Name/i), 'Jordan Lee');
    await user.type(screen.getByLabelText(/Email Address/i), 'jordan@example.test');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'password123');

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByText('The email has already been taken.')).toBeVisible();
    expect(screen.getByLabelText(/Email Address/i)).toHaveFocus();
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
    expect(capturedBody).toEqual({
      name: 'Jordan Lee',
      email: 'jordan@example.test',
      password: 'password123',
      password_confirmation: 'password123',
    });
  });

  it('guards recovery sub-routes and sets no-referrer on /forgot-password', async () => {
    const forgotRender = renderAtRoute('/forgot-password');
    const forgotHeading = await forgotRender.findByRole('heading', {
      level: 1,
      name: 'Forgot password',
    });
    expect(forgotHeading).toBeVisible();
    const meta = document.querySelector('meta[name="referrer"]');
    expect(meta?.getAttribute('content')).toBe('no-referrer');
    await expectNoA11yViolations(forgotRender.container);

    const verifyDirect = renderAtRoute('/verify-code');
    await waitFor(() => {
      expect(verifyDirect.router.state.location.pathname).toBe('/forgot-password');
    });

    const resetDirect = renderAtRoute('/reset-password');
    await waitFor(() => {
      expect(resetDirect.router.state.location.pathname).toBe('/forgot-password');
    });
  });
});
