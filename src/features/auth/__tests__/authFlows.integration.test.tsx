import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/providers';
import { createAppRoutes } from '@/app/router';
import type { UserResource } from '@/shared/api';
import {
  broadcastSessionEvent,
  clearAuthToken,
  getAuthToken,
  registerUnauthorizedHandler,
  resetUnauthorizedGuard,
  setAuthToken,
} from '@/shared/lib';
import { createTestQueryClient } from '@/test/render';
import { mswServer } from '@/test/setup';

const BASE = 'https://collabspace.huma-volve.com/api/v1';

const PM_USER: UserResource = {
  id: 9,
  name: 'Alex Morgan',
  email: 'alex@example.test',
  job_title: 'Project Manager',
  about: null,
  years_of_experience: 6,
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

function mockMeSuccess() {
  return HttpResponse.json({
    success: true,
    message: 'Profile retrieved successfully.',
    data: {
      user: { ...PM_USER, current_project: null },
      stats: { completed_tasks: 1, total_tasks: 2, hours_worked: 8 },
      recent_activities: [],
      teams: [],
      projects: [],
    },
  });
}

function mountApp(initialPath: string) {
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

describe('Auth & App shell workflows (Layer 3 + Layer 5)', () => {
  beforeEach(() => {
    clearAuthToken();
    resetUnauthorizedGuard();
    registerUnauthorizedHandler(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows neutral shell on reload, renders MVP Navbar, and clears on logout', async () => {
    const user = userEvent.setup();
    setAuthToken('fake-persisted-jwt');

    let resolveMe!: () => void;
    mswServer.use(
      http.get(`${BASE}/auth/me`, async () => {
        await new Promise<void>((resolve) => {
          resolveMe = resolve;
        });
        return mockMeSuccess();
      }),
      http.post(`${BASE}/auth/logout`, () => HttpResponse.error()),
    );

    const { router } = mountApp('/projects');

    // Reloading protected route holds neutral skeleton with neither sign-in nor protected heading.
    expect(await screen.findByLabelText('Loading application')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Projects' })).not.toBeInTheDocument();

    resolveMe();
    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();

    // Navbar renders MVP items only (D7) and hides Tier 2 / out-of-scope entries.
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.queryByText(/Chats/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reports/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();

    // Mobile drawer toggles open and closes on Escape.
    const menuToggle = screen.getByRole('button', { name: 'Open navigation menu' });
    await user.click(menuToggle);
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();

    // User menu opens and Sign out clears token even if POST /auth/logout fails.
    await user.click(screen.getByRole('button', { name: /Alex Morgan/i }));
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit Profile' })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(getAuthToken()).toBeNull();
  });

  it('redirects to return path after login and rejects foreign redirectTo URLs', async () => {
    const user = userEvent.setup();
    mswServer.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({
          success: true,
          message: 'Logged in.',
          data: { user: PM_USER, token: 'fake-return-token', token_type: 'Bearer' },
        }),
      ),
      http.get(`${BASE}/auth/me`, () => mockMeSuccess()),
    );

    const { router } = mountApp('/projects/42');
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(router.state.location.search).toBe('?redirectTo=%2Fprojects%2F42');

    await user.type(screen.getByLabelText(/Email Address/i), 'alex@example.test');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Project #42' })).toBeVisible();

    // Foreign redirect target falls back safely to Dashboard.
    clearAuthToken();
    const openRedirectTest = mountApp('/sign-in?redirectTo=//evil.example.test/steal');
    const emailInputs = await screen.findAllByLabelText(/Email Address/i);
    const passInputs = screen.getAllByLabelText('Password');
    const submitButtons = screen.getAllByRole('button', { name: 'Sign in' });
    await user.type(emailInputs[emailInputs.length - 1]!, 'alex@example.test');
    await user.type(passInputs[passInputs.length - 1]!, 'password123');
    await user.click(submitButtons[submitButtons.length - 1]!);

    await waitFor(() => expect(openRedirectTest.router.state.location.pathname).toBe('/'));
  });

  it('runs Forgot -> Verify (timers) -> Reset -> Sign in without URL/console leaks', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const consoleSpy = vi.spyOn(console, 'log');
    const warnSpy = vi.spyOn(console, 'warn');

    let verifyAttempts = 0;
    mswServer.use(
      http.post(`${BASE}/auth/forgot-password`, () =>
        HttpResponse.json({
          success: true,
          message: 'If an account exists for this email, a password reset code has been sent.',
          data: { expires_in_minutes: 10 },
        }),
      ),
      http.post(`${BASE}/auth/verify-reset-otp`, () => {
        verifyAttempts += 1;
        if (verifyAttempts === 1) {
          return HttpResponse.json(
            {
              success: false,
              message: 'The code is invalid or has expired. Please request a new one.',
              errors: { otp: ['The code is invalid or has expired. Please request a new one.'] },
            },
            { status: 422 },
          );
        }
        return HttpResponse.json({
          success: true,
          message: 'The code is valid.',
          data: null,
        });
      }),
      http.post(`${BASE}/auth/reset-password`, () =>
        HttpResponse.json({
          success: true,
          message: 'Password has been reset successfully. Please log in with your new password.',
          data: null,
        }),
      ),
    );

    const { router } = mountApp('/forgot-password');

    await user.type(await screen.findByLabelText(/Email Address/i), 'alex@example.test');
    await user.click(screen.getByRole('button', { name: 'Send verification code' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/verify-code'));
    expect(router.state.location.search).toBe('');
    expect(screen.getByText('Code expires in 10:00')).toBeVisible();

    const resendBtn = screen.getByRole('button', { name: /Resend/i });
    expect(resendBtn).toBeDisabled();

    // Advance 60 seconds so Resend unlocks.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Resend code' }));
    const resendNotice = await screen.findByText(
      'If an account exists for this email, a password reset code has been sent.',
    );
    expect(resendNotice).toBeVisible();

    // Wrong OTP maps 422 error message; valid 6-digit OTP moves to Reset Password.
    await user.type(screen.getByLabelText('Verification code digit 1 of 6'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify code' }));
    expect(
      await screen.findByText('The code is invalid or has expired. Please request a new one.'),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Verify code' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/reset-password'));
    expect(router.state.location.search).toBe('');

    await user.type(screen.getByLabelText('New Password'), 'newpass123');
    await user.type(screen.getByLabelText('Confirm Password'), 'newpass123');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(
      screen.getByText('Your password has been reset. Sign in with your new password.'),
    ).toBeVisible();
    expect(getAuthToken()).toBeNull();
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('123456'));
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('123456'));
  });

  it('clears session on cross-tab signed-out BroadcastChannel event', async () => {
    setAuthToken('fake-tab-token');
    mswServer.use(http.get(`${BASE}/auth/me`, () => mockMeSuccess()));

    const { router } = mountApp('/tasks');
    expect(await screen.findByRole('heading', { level: 1, name: 'Tasks' })).toBeVisible();

    act(() => {
      broadcastSessionEvent('signed-out');
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(getAuthToken()).toBeNull();
  });
});
