import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, expect, it } from 'vitest';
import { AppProviders } from '@/app/providers';
import { createAppRoutes } from '@/app/router';
import { clearAuthToken, setAuthToken } from '@/shared/lib';
import { createTestQueryClient } from '@/test/render';
import { mswServer } from '@/test/setup';

const base = 'https://collabspace.huma-volve.com/api/v1';
const user = {
  id: 1,
  name: 'Example User',
  email: 'example@example.test',
  job_title: 'Designer',
  about: null,
  years_of_experience: 4,
  phone: null,
  avatar_url: null,
  status: 'active',
  available_status: 'available',
  current_project_id: null,
  current_project: null,
  roles: ['Project Manager'],
  permissions: [],
};

afterEach(() => clearAuthToken());

it('keeps the authenticated shell mounted during a failed background profile refresh', async () => {
  setAuthToken('profile-test-token');
  let requests = 0;
  let releaseRefresh: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  mswServer.use(
    http.get(`${base}/auth/me`, async () => {
      requests += 1;
      if (requests > 1) {
        await held;
        return HttpResponse.json({ success: false, message: 'Unavailable' }, { status: 500 });
      }
      return HttpResponse.json({
        success: true,
        data: {
          user,
          stats: { completed_tasks: 0, total_tasks: 0, hours_worked: 0 },
          recent_activities: [],
          teams: [],
          projects: [],
        },
      });
    }),
    http.post(`${base}/auth/profile`, () => HttpResponse.json({ success: true, data: user })),
  );
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: ['/profile/settings'] });
  render(
    <AppProviders queryClient={createTestQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  const formInput = await screen.findByLabelText('Full name');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Profile updated.')).toBeVisible();
  await waitFor(() => expect(requests).toBeGreaterThan(1));
  expect(screen.getByLabelText('Full name')).toBe(formInput);
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  expect(screen.queryByLabelText('Loading application')).not.toBeInTheDocument();
  releaseRefresh();
  await waitFor(() => expect(screen.getByLabelText('Full name')).toBe(formInput));
});
