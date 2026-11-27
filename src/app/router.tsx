import { createBrowserRouter, type RouteObject } from 'react-router';
import {
  loadForgotPasswordPage,
  loadRecoveryFlowLayout,
  loadResetPasswordPage,
  loadSignInPage,
  loadSignUpPage,
  loadVerifyCodePage,
} from '@/features/auth';
import { SessionRoot } from './providers';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/**
 * Application route tree shared between browser runtime and Layer 3 integration tests (ID-3, ID-18).
 * Every screen resolves lazily so public auth pages load zero authenticated shell code.
 */
export function createAppRoutes(): RouteObject[] {
  return [
    {
      element: <SessionRoot />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          lazy: async () => {
            const { PublicOnlyRoute } = await import('./RouteGuards');
            return { Component: PublicOnlyRoute };
          },
          errorElement: <RouteErrorBoundary />,
          children: [
            {
              path: '/sign-in',
              lazy: loadSignInPage,
            },
            {
              path: '/sign-up',
              lazy: loadSignUpPage,
            },
            {
              lazy: loadRecoveryFlowLayout,
              children: [
                {
                  path: '/forgot-password',
                  lazy: loadForgotPasswordPage,
                },
                {
                  path: '/verify-code',
                  lazy: loadVerifyCodePage,
                },
                {
                  path: '/reset-password',
                  lazy: loadResetPasswordPage,
                },
              ],
            },
          ],
        },
        {
          lazy: async () => {
            const { ProtectedRoute } = await import('./RouteGuards');
            return { Component: ProtectedRoute };
          },
          errorElement: <RouteErrorBoundary />,
          children: [
            {
              index: true,
              lazy: async () => {
                const { loadDashboardPage } = await import('@/features/dashboard');
                return loadDashboardPage();
              },
            },
            {
              path: '/projects',
              lazy: async () => {
                const { ProjectsPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: ProjectsPlaceholderPage };
              },
            },
            {
              path: '/projects/:projectId',
              lazy: async () => {
                const { ProjectDetailsPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: ProjectDetailsPlaceholderPage };
              },
            },
            {
              path: '/tasks',
              lazy: async () => {
                const { TasksPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: TasksPlaceholderPage };
              },
            },
            {
              path: '/profile',
              lazy: async () => {
                const { ProfilePlaceholderPage } = await import('./PlaceholderPages');
                return { Component: ProfilePlaceholderPage };
              },
            },
            {
              path: '/profile/settings',
              lazy: async () => {
                const { ProfileSettingsPlaceholderPage } = await import('./PlaceholderPages');
                return { Component: ProfileSettingsPlaceholderPage };
              },
            },
          ],
        },
        {
          path: '*',
          lazy: async () => {
            const { NotFoundPage } = await import('./PlaceholderPages');
            return { Component: NotFoundPage };
          },
        },
      ],
    },
  ];
}

/** Creates the browser router for production entry. */
export function createAppBrowserRouter() {
  return createBrowserRouter(createAppRoutes());
}
