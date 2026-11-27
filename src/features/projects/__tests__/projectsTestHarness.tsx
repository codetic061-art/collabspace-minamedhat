import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { http, HttpResponse, type HttpHandler } from 'msw/http';
import { createMemoryRouter, Outlet } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { SessionProvider } from '@/features/auth';
import type { UserResource } from '@/shared/api';
import {
  clearAuthToken,
  registerUnauthorizedHandler,
  resetUnauthorizedGuard,
  setAuthToken,
  type SystemRole,
} from '@/shared/lib';
import { ToastProvider } from '@/shared/ui';
import { loadProjectDetailsPage, loadProjectsListPage } from '../index';

export interface MockHandlerRegistrar {
  use: (...handlers: HttpHandler[]) => void;
}

export const API_BASE = 'https://collabspace.huma-volve.com/api/v1';

export function makeSessionUser(role: SystemRole): UserResource {
  return {
    id: 7,
    name: 'Alex Morgan',
    email: 'alex@example.test',
    job_title: role,
    about: null,
    years_of_experience: 5,
    phone: null,
    avatar_url: null,
    status: 'active',
    available_status: 'available',
    current_project_id: null,
    roles: [role],
    permissions: [],
    google_linked: false,
    facebook_linked: false,
    linkedin_linked: false,
    created_at: '2026-11-26T10:00:00+00:00',
    updated_at: '2026-11-26T10:00:00+00:00',
  };
}

export function mockSessionMe(role: SystemRole) {
  const user = makeSessionUser(role);
  return http.get(`${API_BASE}/auth/me`, () =>
    HttpResponse.json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: {
        user: { ...user, current_project: null },
        stats: { completed_tasks: 0, total_tasks: 0, hours_worked: 0 },
        recent_activities: [],
        teams: [],
        projects: [],
      },
    }),
  );
}

export function resetSessionForTest() {
  clearAuthToken();
  resetUnauthorizedGuard();
  registerUnauthorizedHandler(null);
  setAuthToken('fake-test-token');
}

export function renderProjectsRoute(
  initialPath: string,
  server: MockHandlerRegistrar,
  role: SystemRole = 'Project Manager',
) {
  server.use(mockSessionMe(role));
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        element: (
          <SessionProvider>
            <main>
              <Outlet />
            </main>
          </SessionProvider>
        ),
        children: [
          { path: '/', element: <h1>Dashboard</h1> },
          { path: '/sign-in', element: <h1>Sign in</h1> },
          { path: '/projects', lazy: loadProjectsListPage },
          { path: '/projects/:projectId', lazy: loadProjectDetailsPage },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );

  return {
    router,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider disablePortal>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
}
